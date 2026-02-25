# 🚀 Copilot Instructions Repository

Welcome to the **Copilot Instructions** repository!  
This project provides a set of best practices, coding rules, and prompt instructions to guide AI-assisted development, especially with GitHub Copilot and similar tools.

## 📚 What does this repository do?

- Defines clear coding standards and architectural rules (e.g., Domain-Driven Design, testing strategies).
- Provides prompt and instruction files for consistent, high-quality code generation.
- Helps teams and AI tools follow the same guidelines for maintainable, robust, and expressive code.

## 🛠️ How to use this repository

1. **Clone the repository**  
   Open your terminal and run:
   ```sh
   git clone https://github.com/your-username/copilot-instructions.git
   ```
2. **Explore the instructions**  
   - Check the `.github/instructions/` folder for coding rules and best practices.
   - Review prompt files in `.github/prompts/` for AI guidance.
   - Read the `copilot-instructions.md` file for Copilot-specific and C#-specific workflow rules.
3. **Apply the rules**  
   - Follow the documented standards in your projects.
   - Use these files to configure Copilot or other AI tools for consistent code generation.


## ✨ Features

- 🏛️ Domain-Driven Design (DDD) guidelines ([see instructions](.github/instructions/domain-driven-design.instructions.md))
- 📐 Specification pattern for business rules ([see instructions](.github/instructions/specification-business-rules-csharp.instructions.md))
- 🧪 Unit & Integration testing best practices ([see instructions](.github/instructions/unit-and-integration-tests.instructions.md))
- 📝 English-only documentation policy
- 🤖 Copilot and AI prompt instructions
- 🔄 TDD-first workflow for C# (see `copilot-instructions.md`)
- ❓ Follow-up Question Enforcement ([see instructions](.github/instructions/follow-up-question.instructions.md))  
   AI must ask clarifying questions and show confidence before code generation.
- 🌐 **Microsoft MCP server integration**: this repository integrates the official Microsoft MCP server to provide real-time access to Microsoft documentation and enhance AI-generated responses ([learn more](https://github.com/MicrosoftDocs/mcp)).
- 🐶 Husky setup prompts for .NET projects (see `.github/prompts/huskydotnet.prompt.md`)
- 🤡 Microcks metadata instructions for API Mock and contract testing:
   - [GroovyScript metadata rules](.github/instructions/microcks-metadata-groovyscript.instructions.md)
   - [JSON body metadata rules](.github/instructions/microcks-metadata-jsonbody.instructions.md)

> [![Watch the video](https://img.youtube.com/vi/QIoorNhYm3s/maxresdefault.jpg)](https://youtu.be/QIoorNhYm3s)

## 📂 Repository Structure

- `.github/instructions/` — All coding rules and best practices (Markdown)
- `.github/prompts/` — Prompt files for Copilot and AI tools
- `.github/chatmodes/` — Chatmode files to configure Copilot/AI behavior (e.g. `architect`)
- `.github/skills/` — Modular skills that extend Copilot capabilities (see below)
- `.github/copilot-instructions.md` — Main Copilot and C# workflow rules
- `README.md` — This file

## 🧑‍💼 What is a chatmode? 

A **chatmode** is a configuration file (in `.github/chatmodes/`) that defines how Copilot or another AI assistant should behave in a specific context or workflow. For example, the `architect` chatmode makes the AI act as an experienced architect and technical lead, focusing on planning, documentation, and Markdown-only outputs. Chatmodes can set the tone, priorities, and constraints for the AI during a session or project.

A **meta-chatmode** is a special chatmode file (e.g., `meta-chatmode.instructions.md`) that defines how to write, structure, and validate other chatmode files. Meta-chatmodes ensure that all chatmodes follow a consistent format and best practices across the repository. They specify the required file structure, naming conventions, expected behavior, and validation checklist for chatmode files. 


## 📏 What is an instruction?

An **instruction** is a Markdown file (in `.github/instructions/`) that defines coding rules, architectural standards, and best practices for the project. Instructions are always active and must be followed for all code and documentation generated in the repository. They ensure consistency, maintainability, and alignment with the project's technical vision (e.g., DDD, specification pattern, testing, commit conventions).

A **meta-instruction** is a special instruction file (e.g., `meta-instructions.instructions.md`) that defines how to write, structure, and validate other instruction files. Meta-instructions ensure that all instructions follow a consistent format and best practices across the repository.

## 💡 What is a prompt?

A **prompt** is a template or guidance file (in `.github/prompts/`) used to help Copilot or another AI tool generate code or documentation in a specific style or for a particular use case. Prompts are reusable and can steer the AI in a particular direction for a given task, such as enforcing TDD, writing API documentation, or generating test cases.

## 🎯 What is a skill?

A **skill** is a modular, self-contained package (in `.github/skills/`) that extends GitHub Copilot's capabilities with specialized knowledge, workflows, and tools. Skills act as "onboarding guides" for specific domains or tasks, transforming Copilot into a specialized agent.

### Available Skills

- **clean-architecture-dotnet**: Complete guide for Clean Architecture with DDD and CQRS (no MediatR), including project initialization scripts and ArchUnit validation
- **application-layer-testing**: Testing Application layer handlers with sociable testing strategy (real Domain objects, mocked Infrastructure)
- **skill-creator**: Create and manage GitHub Copilot skills

## 🧑‍💻 How to contribute

Contributions are welcome!  
Feel free to open issues or submit pull requests to improve the rules, add new practices, or update documentation.

---

> ⚡ **Coming soon:**
> - A hands-on workshop to help you understand and build AI-powered solutions step by step!
> - Rules and best practices for API endpoints, feature slicing, and observability.
> - The [microcks-aspire-dotnet-demo](https://github.com/SebastienDegodez/microcks-aspire-dotnet-demo) repository is the official demo and testbed for these rules and practices.

Happy coding! 💡✨  
If you have any questions, don’t hesitate to open an issue or reach out.
