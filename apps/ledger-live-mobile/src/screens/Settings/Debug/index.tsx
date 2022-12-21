import React, { useCallback, useRef } from "react";
import { Icons, Alert as AlertBox } from "@ledgerhq/native-ui";
import { Alert, TouchableWithoutFeedback, View } from "react-native";
import { useFeatureFlags } from "@ledgerhq/live-common/featureFlags/provider";
import { groupedFeatures } from "@ledgerhq/live-common/featureFlags/groupedFeatures";
import { TrackScreen } from "../../../analytics";
import SettingsRow from "../../../components/SettingsRow";
import { ScreenName } from "../../../const";
import SettingsNavigationScrollView from "../SettingsNavigationScrollView";
import { StackNavigatorProps } from "../../../components/RootNavigator/types/helpers";
import { SettingsNavigatorStackParamList } from "../../../components/RootNavigator/types/SettingsNavigator";
import PoweredByLedger from "../PoweredByLedger";

export default function DebugSettings({
  navigation: { navigate },
}: StackNavigatorProps<
  SettingsNavigatorStackParamList,
  ScreenName.DebugSettings
>) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressCount = useRef(0);

  const { getFeature, overrideFeature } = useFeatureFlags();

  const ruleThemAll = useCallback(() => {
    groupedFeatures.stax.featureIds.forEach(featureId =>
      overrideFeature(featureId, { ...getFeature(featureId), enabled: true }),
    );
    Alert.alert(
      "I can only show you the door, you're the one that has to walk through it.",
    );
  }, [overrideFeature, getFeature]);

  const onDebugHiddenPress = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    pressCount.current += 1;
    const timeout = setTimeout(() => {
      pressCount.current = 0;
    }, 300);
    if (pressCount.current > 6) {
      ruleThemAll();
      pressCount.current = 0;
    }
    timeoutRef.current = timeout;
    return () => {
      clearTimeout(timeout);
    };
  }, [ruleThemAll]);

  return (
    <SettingsNavigationScrollView>
      <TrackScreen category="Settings" name="Debug" />
      <AlertBox
        type={"warning"}
        title={"Tools for development, debugging and QA."}
      />
      <SettingsRow
        title="Configuration"
        desc="Env variables, feature-flags, and toggles."
        iconLeft={<Icons.SettingsMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugConfiguration)}
      />
      <SettingsRow
        title="Features & flows"
        desc="Specific flows and tools"
        iconLeft={<Icons.BoxMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugFeatures)}
      />
      <SettingsRow
        title="Connectivity"
        desc="Transports, proxy, benchmarking, repl"
        iconLeft={<Icons.NanoXAltMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugConnectivity)}
      />
      <SettingsRow
        title="Generators"
        desc="Create new accounts, announcements, etc"
        iconLeft={<Icons.MicrochipMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugGenerators)}
      />
      <SettingsRow
        title="Debugging"
        desc="Logs, application state, errors"
        iconLeft={<Icons.LogsMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugDebugging)}
      />
      <SettingsRow
        title="Information"
        desc="Get information on your current setup"
        iconLeft={<Icons.InfoAltMedium size={24} color="black" />}
        onPress={() => navigate(ScreenName.DebugInformation)}
      />
      <TouchableWithoutFeedback onPress={onDebugHiddenPress}>
        <View>
          <PoweredByLedger />
        </View>
      </TouchableWithoutFeedback>
    </SettingsNavigationScrollView>
  );
}
