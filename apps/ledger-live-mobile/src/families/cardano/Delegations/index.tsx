import React, { useCallback, useState, useMemo , ElementProps } from "react";
import { View, StyleSheet, Linking } from "react-native";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useTranslation } from "react-i18next";
import {
  getAccountCurrency,
  getAccountUnit,
  getMainAccount,
} from "@ledgerhq/live-common/account/index";
import type { Account } from "@ledgerhq/live-common/types/index";
import type { CardanoDelegation } from "@ledgerhq/live-common/families/cardano/types";
import { LEDGER_POOL_ADDRESSES } from "@ledgerhq/live-common/families/cardano/utils";

import AccountDelegationInfo from "../../../components/AccountDelegationInfo";
import AccountSectionLabel from "../../../components/AccountSectionLabel";
import DelegationDrawer from "../../../components/DelegationDrawer";
import type { IconProps } from "../../../components/DelegationDrawer";
import Circle from "../../../components/Circle";
import LText from "../../../components/LText";
import Touchable from "../../../components/Touchable";
import { rgba } from "../../../colors";
import IlluRewards from "../../../icons/images/Rewards";
import { urls } from "../../../config/urls";
import { ScreenName, NavigatorName } from "../../../const";
import RedelegateIcon from "../../../icons/Redelegate";
import UndelegateIcon from "../../../icons/Undelegate";
import DelegationRow from "./Row";
import PoolImage from "../shared/PoolImage";

type Props = {
  account: Account,
  parentAccount: Account,
};

type DelegationDrawerProps = ElementProps<typeof DelegationDrawer>;
type DelegationDrawerActions = DelegationDrawerProps["actions"];

function Delegations({ account }: Props) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const mainAccount = getMainAccount(account, undefined);

  const unit = getAccountUnit(account);
  const currency = getAccountCurrency(account);
  const navigation = useNavigation();

  const { cardanoResources } = account;
  const d: CardanoDelegation = cardanoResources.delegation;

  const [delegation, setDelegation] = useState<CardanoDelegation>();

  const onNavigate = useCallback(
    ({
      route,
      screen,
      params,
    }: {
      route: typeof NavigatorName | typeof ScreenName,
      screen?: typeof ScreenName,
      params?: { [key: string]: any },
    }) => {
      setDelegation();
      navigation.navigate(route, {
        screen,
        params: { ...params, accountId: account.id },
      });
    },
    [navigation, account.id],
  );

  const onDelegate = useCallback(() => {
    onNavigate({
      route: NavigatorName.CardanoDelegationFlow,
      screen: ScreenName.CardanoDelegationStarted,
    });
  }, [onNavigate]);

  const onRedelegate = useCallback(() => {
    onNavigate({
      route: NavigatorName.CardanoDelegationFlow,
      screen: ScreenName.CardanoDelegationSummary,
    });
  }, [onNavigate]);

  const onUndelegate = useCallback(() => {
    // onNavigate({
    //   route: NavigatorName.CosmosUndelegationFlow,
    //   screen: ScreenName.CosmosUndelegationAmount,
    //   params: {
    //     accountId: account.id,
    //     delegation,
    //   },
    // });
  }, [onNavigate, delegation, account]);

  const onCloseDrawer = useCallback(() => {
    setDelegation();
  }, []);

  const onOpenExplorer = useCallback(
    (address: string) => {
      // const url = getAddressExplorer(
      //   getDefaultExplorerView(account.currency),
      //   address,
      // );
      // if (url) Linking.openURL(url);
      const url = "https://preprod.cardanoscan.io/pool/" + address;
      Linking.openURL(url);
    },
    [account.currency],
  );

  const data = useMemo<DelegationDrawerProps["data"]>(() => {
    const d = delegation;

    return d
      ? [
          {
            label: t("cardano.delegation.pool"),
            Component: (
              <LText
                numberOfLines={1}
                semiBold
                ellipsizeMode="middle"
                style={[styles.valueText]}
                color="live"
              >
                {d.name ?? d.poolId ?? ""}
              </LText>
            ),
          },
          {
            label: t("cardano.delegation.poolId"),
            Component: (
              <Touchable
                onPress={() => onOpenExplorer(d.poolId)}
                event="DelegationOpenExplorer"
              >
                <LText
                  numberOfLines={1}
                  semiBold
                  ellipsizeMode="middle"
                  style={[styles.valueText]}
                  color="live"
                >
                  {d.poolId}
                </LText>
              </Touchable>
            ),
          },
          {
            label: t("delegation.delegatedAccount"),
            Component: (
              <LText
                numberOfLines={1}
                semiBold
                ellipsizeMode="middle"
                style={[styles.valueText]}
                color="live"
              >
                {account.name}{" "}
              </LText>
            ),
          },
          {
            label: t("cardano.delegation.drawer.status"),
            Component: (
              <LText
                numberOfLines={1}
                semiBold
                ellipsizeMode="middle"
                style={[styles.valueText]}
                color="live"
              >
                {d.status
                  ? t("cardano.delegation.drawer.active")
                  : t("cardano.delegation.drawer.inactive")}
              </LText>
            ),
          },
          ...(delegation
            ? [
                {
                  label: t("cardano.delegation.drawer.rewards"),
                  Component: (
                    <LText
                      numberOfLines={1}
                      semiBold
                      style={[styles.valueText]}
                    >
                      {delegation.rewards.toString() ?? ""}
                    </LText>
                  ),
                },
              ]
            : []),
        ]
      : [];
  }, [delegation, t, account, onOpenExplorer]);

  const actions = useMemo<DelegationDrawerActions>(() => {
    return [
      {
        label: t("delegation.actions.redelegate"),
        Icon: (props: IconProps) => (
          <Circle
            {...props}
            bg={colors.fog}
          >
            <RedelegateIcon
              color={undefined}
            />
          </Circle>
        ),
        disabled: false,
        onPress: onRedelegate,
        event: "DelegationActionRedelegate",
      },
      {
        label: t("delegation.actions.undelegate"),
        Icon: (props: IconProps) => (
          <Circle
            {...props}
            bg={
              rgba(colors.alert, 0.2)
            }
          >
            <UndelegateIcon />
          </Circle>
        ),
        disabled: false,
        onPress: onUndelegate,
        event: "DelegationActionUndelegate",
      },
    ];
  }, [delegation, account, t, onRedelegate, onUndelegate, colors.lightFog, colors.fog, colors.grey, colors.yellow, colors.alert]);

  return (
    <View style={styles.root}>
      <DelegationDrawer
        isOpen={data && data.length > 0}
        onClose={onCloseDrawer}
        account={account}
        ValidatorImage={({ size }) => (
          <PoolImage
            isLedger={LEDGER_POOL_ADDRESSES.includes(delegation?.poolId)}
            name={
              delegation?.name ??
              delegation?.poolId ??
              ""
            }
            size={size}
          />
        )}
        amount={mainAccount.balance}
        data={data}
        actions={actions}
      />

      {d && d.poolId ? (
        <View style={styles.wrapper}>
          <AccountSectionLabel
            name={t("account.delegation.sectionLabel")}
          />
          <View
            key={d.poolId}
            style={[
              styles.delegationsWrapper,
            ]}
          >
            <DelegationRow
              delegation={d}
              unit={unit}
              currency={account.currency}
              onPress={() => setDelegation(d)}
            />
          </View>
        </View>
      ) : (
        <AccountDelegationInfo
          title={t("account.delegation.info.title")}
          image={<IlluRewards style={styles.illustration} />}
          description={t("cardano.delegation.delegationEarn", {
            name: account.currency.name,
          })}
          infoUrl={urls.cardanoStaking}
          infoTitle={t("cardano.delegation.info")}
          onPress={onDelegate}
          ctaTitle={t("account.delegation.info.cta")}
        />
      )}
    </View>
  );
}

export default function CardanoDelegations({ account }: Props) {
  if (!account.cardanoResources) return null;
  return <Delegations account={account} />;
}

const styles = StyleSheet.create({
  root: {
    marginHorizontal: 16,
  },
  illustration: { alignSelf: "center", marginBottom: 16 },
  rewardsWrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignContent: "center",
    paddingVertical: 16,
    marginBottom: 16,

    borderRadius: 4,
  },
  label: {
    fontSize: 20,
    flex: 1,
  },
  subLabel: {
    fontSize: 14,

    flex: 1,
  },
  column: {
    flexDirection: "column",
  },
  wrapper: {
    marginBottom: 16,
  },
  delegationsWrapper: {
    borderRadius: 4,
  },
  valueText: {
    fontSize: 14,
  },
});
