import React, {useCallback, useEffect, useMemo, useState} from 'react';
import IconInfo from 'components/icons/IconInfo';
import {ImageWithFallback} from 'components/ImageWithFallback';
import ListHead from 'components/ListHead';
import Drawer from 'components/SettingsDrawer';
import {useSelected} from 'contexts/useSelected';
import {useWallet} from 'contexts/useWallet';
import {ethers} from 'ethers';
import {disperseEther} from 'utils/actions/disperseEth';
import {sendEther} from 'utils/actions/sendEth';
import {transfer} from 'utils/actions/transferToken';
import handleInputChangeEventValue from 'utils/handleInputChangeEventValue';
import {useMountEffect, useUpdateEffect} from '@react-hookz/web';
import {Button} from '@yearn-finance/web-lib/components/Button';
import {useWeb3} from '@yearn-finance/web-lib/contexts/useWeb3';
import {hooks} from '@yearn-finance/web-lib/hooks';
import {useChainID} from '@yearn-finance/web-lib/hooks/useChainID';
import {isZeroAddress, toAddress, truncateHex} from '@yearn-finance/web-lib/utils/address';
import {ETH_TOKEN_ADDRESS} from '@yearn-finance/web-lib/utils/constants';
import {toNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import performBatchedUpdates from '@yearn-finance/web-lib/utils/performBatchedUpdates';
import {defaultTxStatus, Transaction} from '@yearn-finance/web-lib/utils/web3/transaction';

import type {TMinBalanceData} from 'hooks/useBalances';
import type {ChangeEvent, Dispatch, ReactElement, SetStateAction} from 'react';
import type {TAddress} from '@yearn-finance/web-lib/utils/address';
import type {TNormalizedBN} from '@yearn-finance/web-lib/utils/format.bigNumber';
import type {TDict} from '@yearn-finance/web-lib/utils/types';

function	TokenRow({address: tokenAddress, balance}: {balance: TMinBalanceData, address: TAddress}): ReactElement {
	const {balances} = useWallet();
	const {selected, set_selected, amounts, set_amounts, destinationAddress} = useSelected();
	const {refresh} = useWallet();
	const {provider, chainID, isActive} = useWeb3();
	const {safeChainID} = useChainID();
	const [txStatus, set_txStatus] = useState(defaultTxStatus);
	const isSelected = useMemo((): boolean => selected.includes(tokenAddress), [selected, tokenAddress]);

	const	handleSuccessCallback = useCallback(async (onlyETH: boolean): Promise<void> => {
		const tokensToRefresh = [{token: ETH_TOKEN_ADDRESS, decimals: balances[ETH_TOKEN_ADDRESS].decimals, symbol: balances[ETH_TOKEN_ADDRESS].symbol}];
		if (!onlyETH) {
			tokensToRefresh.push({token: toAddress(tokenAddress), decimals: balance.decimals, symbol: balance.symbol});
		}

		const updatedBalances = await refresh(tokensToRefresh);
		performBatchedUpdates((): void => {
			if (onlyETH) {
				set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({...amounts, [ETH_TOKEN_ADDRESS]: updatedBalances[ETH_TOKEN_ADDRESS]}));
			} else {
				set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({
					...amounts,
					[ETH_TOKEN_ADDRESS]: updatedBalances[ETH_TOKEN_ADDRESS],
					[toAddress(tokenAddress)]: updatedBalances[toAddress(tokenAddress)]
				}));
			}
			set_selected((s: TAddress[]): TAddress[] => s.filter((item: TAddress): boolean => toAddress(item) !== toAddress(tokenAddress)));
		});
	}, [balance.decimals, balance.symbol, balances, tokenAddress]); // eslint-disable-line react-hooks/exhaustive-deps

	async function	onTransfer(): Promise<void> {
		if (toAddress(tokenAddress) === ETH_TOKEN_ADDRESS) {
			new Transaction(provider, sendEther, set_txStatus).populate(
				toAddress(destinationAddress),
				amounts[ETH_TOKEN_ADDRESS]?.raw
			).onSuccess(async (): Promise<void> => handleSuccessCallback(true)).perform();
		} else {
			try {
				new Transaction(provider, transfer, set_txStatus).populate(
					toAddress(tokenAddress),
					toAddress(destinationAddress),
					amounts[toAddress(tokenAddress)]?.raw
				).onSuccess(async (): Promise<void> => handleSuccessCallback(false)).perform();
			} catch (error) {
				console.error(error);
			}
		}
	}

	const	updateAmountOnChangeChain = useCallback((): void => {
		set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({
			...amounts,
			[toAddress(tokenAddress)]: toNormalizedBN(balance.raw)
		}));
	}, [tokenAddress, balance]); // eslint-disable-line react-hooks/exhaustive-deps

	useMountEffect((): void => {
		if (amounts[toAddress(tokenAddress)] === undefined) {
			set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({
				...amounts,
				[toAddress(tokenAddress)]: toNormalizedBN(balance.raw)
			}));
		}
	});

	useUpdateEffect((): void => {
		updateAmountOnChangeChain();
	}, [chainID, updateAmountOnChangeChain]);

	return (
		<div
			onClick={(): void => set_selected(isSelected ? selected.filter((item: TAddress): boolean => item !== tokenAddress) : [...selected, tokenAddress])}
			className={`yearn--table-wrapper group relative border-x-2 border-y-0 border-solid pb-2 text-left hover:bg-neutral-100/50 ${isSelected ? 'border-neutral-900' : 'border-transparent'}`}>
			<div className={'absolute left-3 top-7 z-10 flex h-full justify-center md:left-6 md:top-0 md:items-center'}>
				<input
					type={'checkbox'}
					checked={isSelected}
					onChange={(): void => set_selected(isSelected ? selected.filter((item: TAddress): boolean => item !== tokenAddress) : [...selected, tokenAddress])}
					className={'checkbox cursor-pointer'} />
			</div>
			<div className={'yearn--table-token-section h-14 border-0 border-neutral-200 pl-8 md:border-r'}>
				<div className={'yearn--table-token-section-item'}>
					<div className={'yearn--table-token-section-item-image'}>
						<ImageWithFallback
							alt={''}
							width={40}
							height={40}
							quality={90}
							src={`https://raw.githubusercontent.com/yearn/yearn-assets/master/icons/multichain-tokens/${safeChainID}/${toAddress(tokenAddress)}/logo-128.png`}
							loading={'eager'} />
					</div>
					<div>
						<div className={'flex flex-row items-center space-x-2'}>
							<b>{balance.symbol}</b>
							{toAddress(tokenAddress) === ETH_TOKEN_ADDRESS ? (
								<div className={'tooltip'}>
									<IconInfo className={'h-[14px] w-[14px] text-neutral-900'} />
									<span className={'tooltiptext text-xs'}>
										<p>{'This amount will be reduced by the sum of the transaction fees incurred during the migration of other tokens, as well as any eventual donations.'}</p>
									</span>
								</div>
							) : null}
						</div>
						<p className={'font-mono text-xs text-neutral-500'}>{truncateHex(tokenAddress, 10)}</p>
					</div>
				</div>
			</div>


			<div className={'yearn--table-data-section'}>
				<div className={'yearn--table-data-section-item md:col-span-10 md:px-6'} datatype={'number'}>
					<label className={'yearn--table-data-section-item-label'}>{'Amount to migrate'}</label>
					<div className={'box-0 flex h-10 w-full items-center p-2'}>
						<div
							className={'flex h-10 w-full flex-row items-center justify-between py-4 px-0'}
							onClick={(e): void => e.stopPropagation()}>
							<input
								className={`w-full overflow-x-scroll border-none bg-transparent py-4 px-0 text-sm font-bold outline-none scrollbar-none ${isActive ? '' : 'cursor-not-allowed'}`}
								type={'number'}
								min={0}
								max={balance.normalized}
								inputMode={'numeric'}
								pattern={'^((?:0|[1-9]+)(?:.(?:d+?[1-9]|[1-9]))?)$'}
								disabled={!isActive}
								value={amounts[toAddress(tokenAddress)]?.normalized ?? '0'}
								onChange={(e: ChangeEvent<HTMLInputElement>): void => {
									let	newAmount = handleInputChangeEventValue(e, balance?.decimals || 18);
									if (newAmount.raw.gt(balance.raw)) {
										newAmount = balance;
									}
									set_amounts((amounts): TDict<TNormalizedBN> => ({...amounts, [toAddress(tokenAddress)]: newAmount}));
								}} />
							<button
								onClick={(): void => {
									set_amounts((amounts): TDict<TNormalizedBN> => ({...amounts, [toAddress(tokenAddress)]: balance}));
								}}
								className={'ml-2 cursor-pointer rounded-sm border border-neutral-900 bg-neutral-100 px-2 py-1 text-xxs text-neutral-900 transition-colors hover:bg-neutral-900 hover:text-neutral-0'}>
								{'max'}
							</button>
						</div>
					</div>
				</div>

				<div
					className={'col-span-1 hidden h-8 w-full flex-col justify-center md:col-span-2 md:flex md:h-14'}
					onClick={(e): void => e.stopPropagation()}>
					<Button
						className={'yearn--button-smaller !w-full'}
						isBusy={txStatus.pending}
						isDisabled={!isActive || ((amounts[toAddress(tokenAddress)]?.raw || ethers.constants.Zero).isZero())}
						onClick={(): void => {
							onTransfer();
						}}>
						{'Migrate'}
					</Button>
				</div>
			</div>
		</div>
	);
}

function	DonateRow({shouldDonateETH, set_shouldDonateETH, amountToDonate, set_amountToDonate}: {
	shouldDonateETH: boolean,
	set_shouldDonateETH: Dispatch<SetStateAction<boolean>>,
	amountToDonate: TNormalizedBN,
	set_amountToDonate: Dispatch<SetStateAction<TNormalizedBN>>,
}): ReactElement {
	const {balances, refresh} = useWallet();
	const {provider, isActive} = useWeb3();
	const {amounts, set_amounts} = useSelected();
	const [txStatus, set_txStatus] = useState(defaultTxStatus);
	const [hasTypedSomething, set_hasTypedSomething] = useState(false);

	const	handleSuccessCallback = useCallback(async (): Promise<void> => {
		const tokensToRefresh = [{token: ETH_TOKEN_ADDRESS, decimals: balances[ETH_TOKEN_ADDRESS].decimals, symbol: balances[ETH_TOKEN_ADDRESS].symbol}];
		const updatedBalances = await refresh(tokensToRefresh);
		performBatchedUpdates((): void => {
			set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({...amounts, [ETH_TOKEN_ADDRESS]: updatedBalances[ETH_TOKEN_ADDRESS]}));
		});
	}, [balances]); // eslint-disable-line react-hooks/exhaustive-deps

	async function	onDonate(): Promise<void> {
		new Transaction(provider, sendEther, set_txStatus).populate(
			toAddress(process.env.RECEIVER_ADDRESS),
			amountToDonate.raw
		).onSuccess(async (): Promise<void> => handleSuccessCallback()).perform();
	}

	useEffect((): void => {
		if (shouldDonateETH && amountToDonate.raw.isZero() && !hasTypedSomething) {
			const	ethBalance = balances?.[ETH_TOKEN_ADDRESS]?.raw || ethers.constants.Zero;
			set_amountToDonate(toNormalizedBN(ethBalance.div(1000).mul(1)));
		} else if (!shouldDonateETH && !amountToDonate.raw.isZero()) {
			set_shouldDonateETH(true);
		} else if (amountToDonate.raw.isZero() && hasTypedSomething) {
			set_shouldDonateETH(false);
		}
	}, [amountToDonate.raw, balances, shouldDonateETH]); // eslint-disable-line react-hooks/exhaustive-deps

	return (
		<div
			onClick={(): void => set_shouldDonateETH((shouldDonateETH: boolean): boolean => !shouldDonateETH)}
			className={`relative col-span-12 mb-0 border-x-2 bg-neutral-0 px-3 py-2 pb-4 text-neutral-900 transition-colors hover:bg-neutral-100 md:px-6 md:pb-2 ${shouldDonateETH ? 'border-neutral-900' : 'border-transparent'}`}>
			<div className={'grid grid-cols-12 md:grid-cols-9'}>
				<div className={'col-span-12 flex h-14 flex-row items-center space-x-4 border-0 border-r border-neutral-200 md:col-span-3'}>
					<input
						type={'checkbox'}
						checked={shouldDonateETH}
						className={'checkbox cursor-pointer'} />
					<b>{'Donate ETH'}</b>
					<div className={'tooltip !ml-2'}>
						<IconInfo className={'h-[14px] w-[14px] text-neutral-900'} />
						<span className={'tooltiptext z-[100000] text-xs'}>
							<p>{'The Migratooor is completely free and doesn\'t charge any fees. However, if you\'d like to support us and help us create new features, you can donate some ETH!'}</p>
						</span>
					</div>
				</div>
				<div className={'col-span-12 flex flex-row items-center px-6 md:col-span-5'}>
					<div
						onClick={(e): void => e.stopPropagation()}
						className={'box-0 flex h-10 w-full items-center p-2'}>
						<div className={'flex h-10 w-full flex-row items-center justify-between py-4 px-0'}>
							<input
								className={'w-full overflow-x-scroll border-none bg-transparent py-4 px-0 text-sm font-bold outline-none scrollbar-none'}
								type={'number'}
								min={0}
								max={balances?.[ETH_TOKEN_ADDRESS]?.normalized || 0}
								inputMode={'numeric'}
								pattern={'^((?:0|[1-9]+)(?:.(?:d+?[1-9]|[1-9]))?)$'}
								value={amountToDonate?.normalized ?? '0'}
								onChange={(e: ChangeEvent<HTMLInputElement>): void => {
									let	newAmount = handleInputChangeEventValue(e, balances[ETH_TOKEN_ADDRESS]?.decimals || 18);
									if (newAmount.raw.gt(balances[ETH_TOKEN_ADDRESS].raw)) {
										newAmount = balances[ETH_TOKEN_ADDRESS];
									}
									performBatchedUpdates((): void => {
										set_hasTypedSomething(true);
										set_amountToDonate(newAmount);
									});
								}} />
						</div>
					</div>
				</div>
				<div
					onClick={(e): void => e.stopPropagation()}
					className={'col-span-1 hidden w-full flex-row items-center md:flex'}>
					<Button
						className={'yearn--button-smaller !w-full'}
						isBusy={txStatus.pending}
						isDisabled={!isActive || ((amounts[ETH_TOKEN_ADDRESS]?.raw || ethers.constants.Zero).isZero())}
						onClick={(): void => {
							onDonate();
						}}>
						{'Donate'}
					</Button>
				</div>
			</div>
		</div>
	);
}

function	ViewTable(): ReactElement {
	const	{isActive, chainID, provider} = useWeb3();
	const	{selected, set_selected, amounts, set_amounts, destinationAddress} = useSelected();
	const	{balances, balancesNonce, refresh} = useWallet();
	const	[sortBy, set_sortBy] = useState<string>('apy');
	const	[sortDirection, set_sortDirection] = useState<'asc' | 'desc'>('desc');
	const	[txStatus, set_txStatus] = useState(defaultTxStatus);
	const	[shouldDonateETH, set_shouldDonateETH] = useState(false);
	const	[amountToDonate, set_amountToDonate] = useState(toNormalizedBN(0));
	const	[isDrawerOpen, set_isDrawerOpen] = useState(false);

	const	balancesToDisplay = hooks.useDeepCompareMemo((): ReactElement[] => {
		return (
			Object.entries(balances || [])
				.filter(([, balance]: [string, TMinBalanceData]): boolean => (
					(balance?.raw && !balance.raw.isZero()) || (balance?.force || false)
				))
				.sort((a: [string, TMinBalanceData], b: [string, TMinBalanceData]): number => {
					const	[, aBalance] = a;
					const	[, bBalance] = b;

					if (sortBy === 'name') {
						return sortDirection === 'asc'
							? aBalance.symbol.localeCompare(bBalance.symbol)
							: bBalance.symbol.localeCompare(aBalance.symbol);
					}
					if (sortBy === 'balance') {
						return sortDirection === 'asc'
							? aBalance.raw.gt(bBalance.raw) ? 1 : -1
							: aBalance.raw.gt(bBalance.raw) ? -1 : 1;
					}
					return 0;
				})
				.map(([address, balance]: [string, TMinBalanceData]): ReactElement => {
					return <TokenRow
						key={`${address}-${chainID}-${balance.symbol}`}
						balance={balance}
						address={toAddress(address)} />;
				})
		);
	}, [balances, balancesNonce, sortBy, sortDirection, chainID]);

	const	handleSuccessCallback = useCallback(async (tokenAddress: TAddress): Promise<void> => {
		const tokensToRefresh = [{token: ETH_TOKEN_ADDRESS, decimals: balances[ETH_TOKEN_ADDRESS].decimals, symbol: balances[ETH_TOKEN_ADDRESS].symbol}];
		if (!isZeroAddress(tokenAddress)) {
			tokensToRefresh.push({token: tokenAddress, decimals: balances[tokenAddress].decimals, symbol: balances[tokenAddress].symbol});
		}

		const updatedBalances = await refresh(tokensToRefresh);
		performBatchedUpdates((): void => {
			if (!isZeroAddress(tokenAddress)) {
				set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({...amounts, [ETH_TOKEN_ADDRESS]: updatedBalances[ETH_TOKEN_ADDRESS]}));
			} else {
				set_amounts((amounts: TDict<TNormalizedBN>): TDict<TNormalizedBN> => ({
					...amounts,
					[ETH_TOKEN_ADDRESS]: updatedBalances[ETH_TOKEN_ADDRESS],
					[tokenAddress]: updatedBalances[tokenAddress]
				}));
			}
			set_selected((s: TAddress[]): TAddress[] => s.filter((item: TAddress): boolean => toAddress(item) !== tokenAddress));
		});
	}, [balances]); // eslint-disable-line react-hooks/exhaustive-deps

	async function	onMigrateSelected(): Promise<void> {
		let	shouldMigrateETH = false;
		const	allSelected = [...selected];
		for (const token of allSelected) {
			if ((amounts[toAddress(token)]?.raw || ethers.constants.Zero).isZero()) {
				continue;
			}
			if (toAddress(token) === ETH_TOKEN_ADDRESS) { //Migrate ETH at the end
				shouldMigrateETH = true;
				continue;
			}
			try {
				new Transaction(provider, transfer, set_txStatus).populate(
					toAddress(token),
					toAddress(destinationAddress),
					amounts[toAddress(token)]?.raw
				).onSuccess(async (): Promise<void> => handleSuccessCallback(toAddress(token))).perform();
			} catch (error) {
				console.error(error);
			}
		}

		if (
			(shouldDonateETH && (amountToDonate?.raw || ethers.constants.Zero).gt(ethers.constants.Zero)) &&
			(shouldMigrateETH && (amounts[ETH_TOKEN_ADDRESS]?.raw || ethers.constants.Zero).gt(ethers.constants.Zero)) &&
			balances[ETH_TOKEN_ADDRESS]?.raw?.gt(amountToDonate.raw.add(amounts[ETH_TOKEN_ADDRESS]?.raw || ethers.constants.Zero))
		) {
			new Transaction(provider, disperseEther, set_txStatus).populate(
				toAddress(destinationAddress),
				amounts[ETH_TOKEN_ADDRESS]?.raw,
				amountToDonate.raw
			).onSuccess(async (): Promise<void> => handleSuccessCallback(toAddress(ethers.constants.AddressZero))).perform();
		} else if (shouldDonateETH && (amountToDonate?.raw || ethers.constants.Zero).gt(ethers.constants.Zero)) {
			new Transaction(provider, sendEther, set_txStatus).populate(
				toAddress(process.env.RECEIVER_ADDRESS),
				amountToDonate.raw
			).onSuccess(async (): Promise<void> => handleSuccessCallback(toAddress(ethers.constants.AddressZero))).perform();
		} else if (shouldMigrateETH && (amounts[ETH_TOKEN_ADDRESS]?.raw || ethers.constants.Zero).gt(ethers.constants.Zero)) {
			new Transaction(provider, sendEther, set_txStatus).populate(
				toAddress(destinationAddress),
				amounts[ETH_TOKEN_ADDRESS]?.raw
			).onSuccess(async (): Promise<void> => handleSuccessCallback(toAddress(ethers.constants.AddressZero))).perform();
		}
	}

	return (
		<div id={'select'} className={'mb-32 pt-10 md:mb-[800px]'}>
			<div className={'box-0 relative mb-6 grid w-full grid-cols-12 overflow-hidden'}>
				<div className={'col-span-12 flex flex-col p-4 pb-0 text-neutral-900 md:p-6'}>
					<div className={'w-full md:w-3/4'}>
						<b>{'Select the tokens to migrate'}</b>
						<p className={'text-sm text-neutral-500'}>
							{'Select the tokens you want to migrate to another wallet. You can migrate all your tokens at once or select individual tokens.'}
						</p>
					</div>
				</div>
				<div className={'col-span-12 -mt-4 flex flex-col border-b border-neutral-200 px-4 pb-6 text-neutral-900 md:px-6'}>
					<p className={'text-sm text-neutral-500'}>
						{'You want more control over the list of available tokens? '}
						<span
							className={'cursor-pointer text-sm text-neutral-500 underline hover:text-neutral-900'}
							onClick={(): void => set_isDrawerOpen(true)}>
							{'Customize your list here!'}
						</span>
					</p>
					<Drawer isDrawerOpen={isDrawerOpen} set_isDrawerOpen={set_isDrawerOpen} />
				</div>

				<div className={'col-span-12'}>
					<ListHead
						sortBy={sortBy}
						sortDirection={sortDirection}
						onSort={(newSortBy, newSortDirection): void => {
							performBatchedUpdates((): void => {
								set_sortBy(newSortBy);
								set_sortDirection(newSortDirection as 'asc' | 'desc');
							});
						}}
						items={[
							{label: 'Token', value: 'name', sortable: true},
							{label: 'Amount', value: 'balance', sortable: false, className: 'col-span-10 md:pl-5', datatype: 'text'},
							{label: '', value: '', sortable: false, className: 'col-span-2'}
						]} />
					<div>
						{balancesToDisplay}
					</div>
				</div>

				<div className={'col-span-12'}>
				</div>

				<DonateRow
					shouldDonateETH={shouldDonateETH}
					amountToDonate={amountToDonate}
					set_shouldDonateETH={set_shouldDonateETH}
					set_amountToDonate={set_amountToDonate} />


				<div className={'fixed inset-x-0 bottom-0 z-20 col-span-12 flex w-full max-w-4xl flex-row items-center justify-between bg-neutral-900 p-4 text-neutral-0 md:relative md:p-6'}>
					<div className={'flex flex-col'}>
						<b>{`Migrate ${selected.length} tokens`}</b>
						<p className={'text-xs tabular-nums'}>
							{'To '}
							<span className={'font-number'}>{toAddress(destinationAddress)}</span>
						</p>
					</div>
					<div>
						<Button
							className={'yearn--button-smaller !w-[160px] !text-sm'}
							variant={'reverted'}
							isBusy={txStatus.pending}
							isDisabled={!isActive || (selected.length === 0)}
							onClick={(): void => {
								onMigrateSelected();
							}}>
							{'Migrate selected'}
						</Button>
					</div>
				</div>

			</div>
		</div>
	);
}
export default ViewTable;
