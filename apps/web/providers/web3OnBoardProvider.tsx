// "use client";
// // import {
// //   Web3OnboardProvider as BlockNativeProvider,
// //   init,
// // } from "@web3-onboard/react";
// // import injectedModule from "@web3-onboard/injected-wallets";
// // import coinbaseModule from "@web3-onboard/coinbase";
// // import walletConnectModule from "@web3-onboard/walletconnect";
// // import web3authModule from "@web3-onboard/web3auth";
// // import gnosisModule from "@web3-onboard/gnosis";
// // import trustModule from "@web3-onboard/trust";
// // import frameModule from "@web3-onboard/frame";
// // import metamaskModule from "@web3-onboard/metamask";
// import { sepolia } from "wagmi/chains";

// type Chain = {
//   id: `0x${string}`;
//   token: string;
//   label: string;
//   rpcUrl: string;
// };

// const getFormatedChains = (chains: any[]): Chain[] =>
//   chains.map((chain) => ({
//     id: `0x${chain.id}`,
//     token: chain.nativeCurrency.symbol,
//     label: chain.nativeCurrency.name,
//     rpcUrl: chain.rpcUrls.default.http[0],
//   }));

// const chains = getFormatedChains([sepolia, localChain]);

// // const injected = injectedModule();
// // const coinbase = coinbaseModule();
// // const walletConnect = walletConnectModule({
// //   projectId: "cc52770b49b75b8067dfa6149a52b103", // change project id
// // });
// // const gnosis = gnosisModule();
// // const trust = trustModule();
// // const frameWallet = frameModule();
// // const metamask = metamaskModule({
// //   options: {
// //     extensionOnly: false,
// //     i18nOptions: {
// //       enabled: true,
// //     },
// //     dappMetadata: {
// //       name: "Gardens v2 Demo",
// //     },
// //   },
// // });
// // const web3auth = web3authModule({
// //   clientId:
// //     "BPlwiM9jQ8XDABDGNJaJqdj6NxJNsdnGGAjYXyxPII6Cqh6B4QGkrqu_UCqzz-B198Pj0Ll8PTPdH1XcRHUEgWE",
// // });

// const wallets = [
//   injected,
//   coinbase,
//   walletConnect,
//   gnosis,
//   trust,
//   frameWallet,
//   metamask,
//   // web3auth,
//   // trezor,
//   // ledger
// ];

// const web3Onboard = init({
//   connect: {
//     autoConnectAllPreviousWallet: true,
//   },
//   wallets,
//   chains,
//   appMetadata: {
//     name: "Gardens v2",
//     icon: "<svg>App Icon</svg>",
//     description: "Gardens v2 description",
//     logo: "<SVG_LOGO_STRING>",
//     recommendedInjectedWallets: [
//       // { name: 'Coinbase', url: 'https://wallet.coinbase.com/' },
//       { name: "MetaMask", url: "https://metamask.io" },
//     ],
//   },
// });

// export default function Web3OnboardProvider({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   return (
//     <BlockNativeProvider web3Onboard={web3Onboard}>
//       {children}
//     </BlockNativeProvider>
//   );
// }
