#!/usr/bin/env ts-node

import { Command } from "commander";
import { execSync } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { ethers } from "ethers";

const program = new Command();

program.version("1.0.0").description("CLI tool for dApp development");

/**
 * Scaffold a new dApp project directory with minimal package.json
 */
program
  .command("scaffold <projectName>")
  .description("Scaffold a full dApp project (Hardhat + Vite)")
  .action(async (projectName) => {
    try {
      const projectPath = path.join(process.cwd(), projectName);
      await fs.mkdir(projectPath, { recursive: true });
      process.chdir(projectPath);

      console.log("📦 Initializing Node.js project...");
      execSync("npm init -y", { stdio: "inherit" });

      console.log("🛠 Installing Hardhat...");
      execSync("npm install --save-dev hardhat", { stdio: "inherit" });

      console.log("🔧 Setting up Hardhat...");
      execSync("npx hardhat init --force", { stdio: "inherit" });

      console.log("📁 Creating directory structure...");
      await fs.mkdir("contracts", { recursive: true });
      await fs.mkdir("scripts", { recursive: true });

      console.log("✍️ Adding example contract...");
      await fs.writeFile(
        "contracts/Greeter.sol",
        `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Greeter {
    string private greeting;

    constructor(string memory _greeting) {
        greeting = _greeting;
    }

    function greet() public view returns (string memory) {
        return greeting;
    }

    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
}
`,
        "utf-8"
      );

      console.log("📜 Adding deploy script...");
      await fs.writeFile(
        "scripts/deploy.js",
        `async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with:", deployer.address);

  const Greeter = await ethers.getContractFactory("Greeter");
  const greeter = await Greeter.deploy("Hello, world!");
  await greeter.deployed();

  console.log("Greeter deployed to:", greeter.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`,
        "utf-8"
      );

      console.log("🌐 Setting up Vite + React frontend...");
      execSync("npm create vite@latest frontend -- --template react-ts", {
        stdio: "inherit",
      });

      console.log("📦 Installing frontend dependencies...");
      execSync("cd frontend && npm install", { stdio: "inherit" });

      console.log(`✅ Project "${projectName}" scaffolded successfully.`);
    } catch (error) {
      console.error("❌ Error scaffolding dApp project:", error);
      process.exit(1);
    }
  });

/**
 * Compile smart contracts using Hardhat
 */
program
  .command("compile")
  .description("Compile smart contracts")
  .action(() => {
    try {
      execSync("npx hardhat compile", { stdio: "inherit" });
    } catch (error) {
      console.error("Compilation failed:", error);
      process.exit(1);
    }
  });

/**
 * Deploy smart contracts with configurable network
 */
program
  .command("deploy")
  .description("Deploy smart contracts")
  .option("-n, --network <network>", "Specify the network", "localhost")
  .action((options) => {
    const network = options.network;
    try {
      execSync(`npx hardhat run scripts/deploy.js --network ${network}`, {
        stdio: "inherit",
      });
    } catch (error) {
      console.error("Deployment failed:", error);
      process.exit(1);
    }
  });

/**
 * Generate React hooks from contract ABI
 */
program
  .command("generate-hooks <abiPath>")
  .description("Generate React hooks from contract ABI JSON file")
  .action(async (abiPath) => {
    try {
      const abiContent = await fs.readFile(abiPath, "utf-8");
      const abiJson = JSON.parse(abiContent);

      const hooksCode = `import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

export const useContract = (contractAddress: string) => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    if (!window.ethereum) {
      console.error('MetaMask or another Ethereum wallet extension is required');
      return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contractInstance = new ethers.Contract(contractAddress, ${JSON.stringify(
      abiJson,
      null,
      2
    )}, provider);
    setContract(contractInstance);
  }, [contractAddress]);

  return contract;
};
`;

      const outputPath = path.join(path.dirname(abiPath), "useContract.ts");
      await fs.writeFile(outputPath, hooksCode, "utf-8");
      console.log(`React hook generated at: ${outputPath}`);
    } catch (error) {
      console.error("Failed to generate hooks:", error);
      process.exit(1);
    }
  });

/**
 * Start the frontend development server (npm start)
 */
program
  .command("start")
  .description("Start the frontend development server")
  .action(() => {
    try {
      execSync("npm start", { stdio: "inherit" });
    } catch (error) {
      console.error("Failed to start frontend dev server:", error);
      process.exit(1);
    }
  });

/**
 * Verify contract on Etherscan with network option
 */
program
  .command("verify <contractAddress> <contractName>")
  .description("Verify smart contract on Etherscan")
  .option("-n, --network <network>", "Specify the network", "localhost")
  .action((contractAddress, contractName, options) => {
    const network = options.network;
    try {
      execSync(
        `npx hardhat verify --network ${network} ${contractAddress} ${contractName}`,
        { stdio: "inherit" }
      );
    } catch (error) {
      console.error("Verification failed:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
