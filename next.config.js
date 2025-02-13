/* eslint-disable @typescript-eslint/explicit-function-return-type */
const withPWA = require('next-pwa')({
	dest: 'public',
	disable: process.env.NODE_ENV !== 'production'
});
const {PHASE_EXPORT} = require('next/constants');

module.exports = (phase) => withPWA({
	assetPrefix: process.env.IPFS_BUILD === 'true' || phase === PHASE_EXPORT ? './' : '/',
	images: {
		unoptimized: process.env.IPFS_BUILD === 'true' || phase === PHASE_EXPORT, //Exporting image does not support optimization
		domains: [
			'rawcdn.githack.com',
			'raw.githubusercontent.com',
			'ipfs.io',
			's3.amazonaws.com',
			'1inch.exchange',
			'hut34.io',
			'www.coingecko.com',
			'defiprime.com',
			'cdn.furucombo.app',
			'gemini.com',
			'messari.io',
			'ethereum-optimism.github.io',
			'tryroll.com',
			'logo.assets.tkn.eth.limo',
			'umaproject.org',
			'cloudflare-ipfs.com'
		]
	},
	redirects() {
		return [
			{
				source: '/github',
				destination: 'https://github.com/Majorfi/migratooor',
				permanent: true
			}
		];
	},
	env: {
		JSON_RPC_URL: {
			1: process.env.RPC_URL_MAINNET,
			10: process.env.RPC_URL_OPTIMISM,
			250: 'https://rpc3.fantom.network' || process.env.RPC_URL_FANTOM,
			42161: process.env.RPC_URL_ARBITRUM
		},
		RECEIVER_ADDRESS: '0x5b555B6fC357434eb7bA572A87F3AcA30AB5D272',
		DISPERSE_ADDRESS: '0xD152f549545093347A162Dce210e7293f1452150'
	}
});
