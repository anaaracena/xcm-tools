// Contains detailed structure of XCM call construction for Ajuna Parachain on Polkadot

import { isSymbolMatch } from '@paraspell/assets'
import type { TParachain, TRelaychain } from '@paraspell/sdk-common'
import { Version } from '@paraspell/sdk-common'

import { transferPolkadotXcm } from '../../pallets/polkadotXcm'
import type {
  IPolkadotXCMTransfer,
  TPolkadotXCMTransferOptions,
  TTransferLocalOptions,
  TWeight
} from '../../types'
import { assertHasId } from '../../utils'
import SubstrateChain from '../SubstrateChain'

export const DEFAULT_AJUNA_STABLE_WEIGHT: TWeight = {
  refTime: 4000000000n,
  proofSize: 64000n
}

export const isAjunaStableAsset = (symbol: string): boolean =>
  isSymbolMatch(symbol, 'USDt') || isSymbolMatch(symbol, 'USDC')

export const calculateAjunaStableFee = (symbol: string, customFee?: bigint): bigint => {
  if (isAjunaStableAsset(symbol)) {
    const minFee = 50000n // 0.05 USD (decimals 6)
    return customFee !== undefined && customFee > minFee ? customFee : minFee
  }
  return customFee ?? 0n
}

class Ajuna<TApi, TRes, TSigner, TCustomChain extends string = never>
  extends SubstrateChain<TApi, TRes, TSigner, TCustomChain>
  implements IPolkadotXCMTransfer<TApi, TRes, TSigner, TCustomChain>
{
  constructor(
    chain: TParachain = 'Ajuna',
    info: string = 'ajuna',
    ecosystem: TRelaychain = 'Polkadot',
    version: Version = Version.V5
  ) {
    super(chain, info, ecosystem, version)
  }

  getExecutionWeight(symbol?: string): TWeight | undefined {
    if (symbol && isAjunaStableAsset(symbol)) {
      return DEFAULT_AJUNA_STABLE_WEIGHT
    }
    return undefined
  }

  transferPolkadotXCM(
    input: TPolkadotXCMTransferOptions<TApi, TRes, TSigner, TCustomChain>
  ): Promise<TRes> {
    return transferPolkadotXcm(input)
  }

  isRelayToParaEnabled(): boolean {
    return false
  }

  transferLocalNonNativeAsset(
    options: TTransferLocalOptions<TApi, TRes, TSigner, TCustomChain>
  ): TRes {
    const { api, assetInfo: asset, recipient, isAmountAll, keepAlive } = options

    assertHasId(asset)

    const assetId = Number(asset.assetId)
    const dest = { Id: recipient }

    if (isAmountAll) {
      return api.deserializeExtrinsics({
        module: 'Assets',
        method: 'transfer_all',
        params: {
          id: assetId,
          dest,
          keep_alive: keepAlive
        }
      })
    }

    return api.deserializeExtrinsics({
      module: 'Assets',
      method: keepAlive ? 'transfer_keep_alive' : 'transfer',
      params: {
        id: assetId,
        target: dest,
        amount: asset.amount
      }
    })
  }
}

export default Ajuna
