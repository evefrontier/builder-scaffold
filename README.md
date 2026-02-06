# Builder Scaffold

**Templates and tools to build in eve-frontier world**

Development toolkit for building custom extensions, dApps, and integrations on the Frontier World Contracts. 

This scaffold provides templates to extend Smart Assemblies, create tokens, build frontend applications, automate login workflows, and set up local development environments.

## What's Included

- Docker setup for local development environment
- Move Contracts template to extend Smart Assemblies
- TypeScript examples to interact with contracts
- Rust scripts with equivalent functionality to TypeScript scripts
- dApp template for extension use cases
- zkLogin CLI

Review the README in each directory for specific setup instructions

## High Level Builder Flow (What you’ll be able to do)

1. **Setup your local development environment** run a local sui node for development (localnet) and deploy a hello world move contract.
2. **Deploy an EVE Frontier world locally** and seed test resources (localnet).
3. **Mod a Smart Assembly** by adding custom Move logic (example: Smart Gate extension).
4. **Deploy your custom Move package on-chain** (localnet/testnet/production).
5. **Configure & test the custom logic** by authorizing it for a Smart Assembly you own, then running interactions (scripts) based on the environment.
6. **Submit transactions using zkLogin** (ephemeral keys + JWT-based flow; typically used on hosted networks like testnet).
7. **Build a dapp UI** that connects to a wallet and interacts with your deployed packages (typically testnet).


## End to end Local Development Flow 
Follow the instructions [here](./docker/readme.md). You can skip this step if you are connecting to the testnet
Follow the instrcutions [here](./setup-world/readme.md). It deploys the world, creates some test resources (smart assemblies and inventory items). You can skip this step if you are connecting to the testnet world
Refer [gate-extension](./move-contracts/gate/) to see how to mod the smart gate with the custom logic 
Deploy the gate package to your desired environment. 
You can either interact with the deployed contracts using the ts-script or process to building a dapp to interact with the deployed contracts via a UI 

## End to end Testnet Development Flow

This section is primarily for deploying custom extension packages and configuring them for existing in-game Smart Assemblies on testnet. Most other in-game interactions must be performed via the game UI.

Note: Some Smart Assembly interactions can only be performed via the in-game UI. The game enforces certain in-game constraints (e.g., player position/proximity) that scripts can’t satisfy.

Example: jumping through a gate can’t be triggered from scripts because your character must be next to the gate when the jump occurs.


## End to end Production/Stillness Development Flow


## Project Structure
builder-scaffold/
├── dapps/               # Reference dApp
├── docker/              # Dev containers
├── move-contracts/      # Move extension examples
├── rust-scripts/        # Rust interaction scripts
├── ts-scripts/          # TypeScript interaction scripts
└── zklogin/             # zkLogin automation scripts

## Contributing

Contributions welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) and open an issue/feature request before submitting PRs.