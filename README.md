<div align="center">
  <img src="https://avatars.githubusercontent.com/u/218705333?s=400&u=a064fae0b376dc9366ce11db88177682ca749cc5&v=4" alt="OpenHive Logo Banner" width="100" height="100">
  <br>
  <h1>OpenHive: The Universal Registry for the Agentic Web</h1>
  <p>
    The foundational layer for autonomous AI agents. Build, register, and discover agents that collaborate seamlessly.
  </p>
  <p>
    <a href="LICENSE">
      <img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache 2.0">
    </a>
    <a href="https://www.openhive.cloud">
      <img src="https://img.shields.io/badge/Website-openhive.cloud-orange" alt="Website">
    </a>
    <a href="CONTRIBUTING.md">
      <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
    </a>
    <a href="https://discord.gg/qsfG2tJ6mJ">
        <img src="https://img.shields.io/discord/1299557482329571398?color=5865F2&logo=discord&logoColor=white" alt="Discord">
    </a>
  </p>
</div>

---

## 👋 Introduction

OpenHive is an open-source registry and platform designed to help developers build, publish, and connect AI agents. We provide the tools and standards needed to create a collaborative ecosystem where agents can work together regardless of how they were built.

Our goal is simple: make it easy to discover and integrate agents without locking you into a single vendor or proprietary, closed loop ecosystem.

## 🚀 Features

-   **Open Registry**: A central hub to publish your agents and discover others to integrate with.
-   **Code-First Workflow**: Scaffold agent integrations directly into your project. You own the code.
-   **Verifiable Identity**: Every agent gets a unique, secure identity (DID) to establish trust.
-   **Access Control**: Manage permissions and authentication for Agent-to-Agent (A2A) communication effortlessly.
-   **Built-in Monitoring**: Track agent activity and performance with native telemetry support.

## 🛠️ Getting Started

### Prerequisites

-   Node.js 18+
-   npm, pnpm, or bun

### Local Development

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/openhivestack/openhive.git
    cd openhive
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or
    pnpm install
    ```

3.  **Set up environment variables:**
    Copy the example environment file and update it with your configuration:
    ```bash
    cp .env.example .env
    ```
    At a minimum, ensure your `DATABASE_URL` is correct.

4.  **Start the development server:**
    ```bash
    npm run dev
    ```

5.  **Open locally:**
    Navigate to [http://localhost:3000](http://localhost:3000) to see the OpenHive registry running locally.

## 🤝 Contributing

We welcome contributions from the community! Whether it's fixing bugs, improving documentation, or proposing new features, your help is appreciated.

Please read our [Contributing Guidelines](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before getting started.

## 📄 License

**OpenHive** follows an **Open Core** model:

-   **Core Platform**: The code in this repository (excluding the `ee` directory) is open source under the **[Apache 2.0 License](LICENSE)**.
-   **Enterprise Edition**: Advanced features located in the `ee/` directory are proprietary and subject to the **[Enterprise License](ee/LICENSE)**.

---

<div align="center">
  <p>
    Built with ❤️ by <a href="https://github.com/openhivestack">OpenHive Team</a>
  </p>
</div>
