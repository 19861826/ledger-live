// @flow

import React, { PureComponent } from 'react'
import type { Account, TokenAccount } from '@ledgerhq/live-common/lib/types'
import {
  getAccountCurrency,
  getAccountUnit,
  getAccountName,
} from '@ledgerhq/live-common/lib/account'
import Box from 'components/base/Box'
import Bar from 'components/base/Bar'
import FormattedVal from 'components/base/FormattedVal'
import ParentCryptoCurrencyIcon from 'components/ParentCryptoCurrencyIcon'
import TooltipEllipsis from 'components/base/TooltipEllipsis'
import AccountSyncStatusIndicator from '../AccountSyncStatusIndicator'
import Star from '../../Stars/Star'

class HeadText extends PureComponent<{
  title: string,
  name: string,
}> {
  render() {
    const { title, name } = this.props

    return (
      <Box grow>
        <Box style={{ textTransform: 'uppercase' }} fontSize={10} color="palette.text.shade80">
          {title}
        </Box>
        <TooltipEllipsis fontSize={13} color="palette.text.shade100">
          {name}
        </TooltipEllipsis>
      </Box>
    )
  }
}

class Header extends PureComponent<{
  account: Account | TokenAccount,
  parentAccount: ?Account,
}> {
  render() {
    const { account, parentAccount } = this.props
    const currency = getAccountCurrency(account)
    const unit = getAccountUnit(account)
    const name = getAccountName(account)

    let title
    switch (account.type) {
      case 'Account':
      case 'AccountChild':
        title = currency.name
        break
      case 'TokenAccount':
        title = 'token'
        break
      default:
        title = ''
    }

    return (
      <Box flow={4}>
        <Box horizontal ff="Inter|SemiBold" flow={3} alignItems="center">
          <ParentCryptoCurrencyIcon currency={currency} withTooltip />
          <HeadText name={name} title={title} />
          <AccountSyncStatusIndicator
            accountId={(parentAccount && parentAccount.id) || account.id}
            account={account}
          />
          <Star accountId={account.id} />
        </Box>
        <Bar size={1} color="palette.divider" />
        <Box justifyContent="center">
          <FormattedVal
            alwaysShowSign={false}
            animateTicker={false}
            ellipsis
            color="palette.text.shade100"
            unit={unit}
            showCode
            val={account.balance}
          />
        </Box>
      </Box>
    )
  }
}

export default Header
