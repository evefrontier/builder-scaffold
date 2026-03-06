# Troubleshooting
<!-- COPY THIS TEMPLATE TO ADD MORE -->
<!-- <details><summary>Title</summary>// Error details</details> -->
Below are some of the common gotchas during building: 

**Failed transactions — how to read the error?**
Use the [World Contracts Decoder](https://evefrontier.github.io/world-contracts/) to decode the error message into a human-readable form.

<details><summary>Move.lock wrong env? </summary>`rm Move.lock && sui move build --build-env testnet`</details>

<details><summary>Unpublished dependencies: World?</summary>
![publish error](../images/publish-error.png)

Deploy world-contracts first (see [builder-flow-docker.md](../docs/builder-flow-docker.md#deploy-world-and-create-test-resources)), then pass its publication file:

```bash
sui client test-publish --build-env testnet --pubfile-path ../../deployments/Pub.localnet.toml
```
</details>

<details><summary>File permission denied for.env </summary>
chmod 600 .env
</details>

<details>
<summary>Error: No valid gas coins found for the transaction.</summary>
Make sure your account is funded and you are importing the right keys. [See builder flow (host)](./docs/builder-flow-host.md#4-make-sure-the-keys-are-funded).
</details>

<!-- <details><summary>Title</summary>
// Error details
</details> -->



