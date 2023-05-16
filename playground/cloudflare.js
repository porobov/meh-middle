const cloudFlareWorkersKV = require('@kikobeats/cloudflare-workers-kv')

async function main() {

  const namespaceId = "" // The ID of your KV namespace
  const accountId = ""
  const apiToken = ''

  const store = cloudFlareWorkersKV({
    accountId: accountId,
    key: apiToken,
    namespaceId: namespaceId
  })
  // set a value forever
  console.log(await store.set('foo', JSON.stringify({ asdfa: "asdfafff" })))

  // get a value
  console.log(await store.get('foo'))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })