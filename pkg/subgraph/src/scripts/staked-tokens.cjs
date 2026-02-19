const arbitrum =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---arbitrum/version/latest";
const optimism =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---optimism/version/latest";
const polygon =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---polygon/version/latest";
const gnosis =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---gnosis/version/latest";
const base =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---base/version/latest";
const celo =
  "https://api.studio.thegraph.com/query/102093/gardens-v2---celo/version/latest";

if (!process.argv[2]) {
  console.error(
    "Error: Missing wallet argument.\nUsage: node staked-tokens.cjs <wallet-address>",
  );
  process.exit(1);
}
const wallet = process.argv[2].toLowerCase();

const query = `
{
  member(id:"${wallet}") {
    id
    memberCommunity(where:{stakedTokens_not:0}) {
      stakedTokens
      registryCommunity {
        communityName
        garden {
          name
          decimals
          symbol
        }
      }
    }
  }
}`;

const allSubgraphs = {
  arbitrum,
  optimism,
  polygon,
  gnosis,
  base,
  celo,
};

async function fetchStakedTokens() {
  const tokens = {};
  for (const key of Object.keys(allSubgraphs)) {
    const element = allSubgraphs[key];
    console.log("Querying subgraph: ", key);
    const res = await fetch(element, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    const resJson = await res.json();
    try {
      if (resJson.data.member) {
        for (const mc of resJson.data.member.memberCommunity) {
          const tokenSymbol = mc.registryCommunity.garden.symbol;
          if (tokens[tokenSymbol]) {
            tokens[tokenSymbol].stakedTokensTotal +=
              +mc.stakedTokens / 10 ** mc.registryCommunity.garden.decimals;
            tokens[tokenSymbol].communities.push({
              community: mc.registryCommunity.communityName,
              chain: key,
              stakedTokens:
                +mc.stakedTokens / 10 ** mc.registryCommunity.garden.decimals,
            });
          } else {
            tokens[tokenSymbol] = {
              communities: [
                {
                  community: mc.registryCommunity.communityName,
                  chain: key,
                  stakedTokens:
                    +mc.stakedTokens /
                    10 ** mc.registryCommunity.garden.decimals,
                },
              ],
              garden: mc.registryCommunity.garden.name,
              stakedTokensTotal:
                +mc.stakedTokens / 10 ** mc.registryCommunity.garden.decimals,
              decimals: mc.registryCommunity.garden.decimals,
              symbol: tokenSymbol,
            };
          }
        }
      } else {
        console.log("No member data found");
      }
    } catch (error) {
      console.error("Error processing member data: ", { error, resJson });
    }
  }

  // Pretty format tokens
  console.log("Staked tokens:");
  for (const t of Object.values(tokens)) {
    console.log(
      `${(t.symbol ?? "").toString().trim()} -> ${t.stakedTokensTotal.toPrecision(5)}:`,
    );
    for (const c of t.communities) {
      console.log(
        `  - ${c.chain} - ${c.community}: ${c.stakedTokens.toPrecision(5)} ${t.symbol}`,
      );
    }
  }
}

fetchStakedTokens();
