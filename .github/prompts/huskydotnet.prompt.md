---
description: Installation and Initialization of Husky for .NET
mode: agent
---

# Installation and Initialization of Husky for .NET

Husky is a tool that helps you manage Git hooks easily. Below are the steps to install and initialize Husky for your .NET project.

## Prerequisites

Ensure you have the following installed:

- Node.js and npm
- Git
- .NET SDK

## Steps

1. **Install Husky**

   Run the following command to install Husky:

   ```bash
   dotnet new tool-manifest
   dotnet tool install husky
   ```

2. **Enable Git Hooks**

   Initialize Husky to enable Git hooks:

   ```bash
   dotnet husky install
   ```

   This will create a `.husky/` directory in your project.


3. **Add a Commit Message Hook**

   Create a commit message hook to lint commit messages (⚠️ do not prefix with `.husky/` in the command):

   ```bash
   dotnet husky add commit-msg -c "dotnet husky run --name commit-message-linter --args \"$1\""
   ```

   Also, ensure the following file is created at `.husky/csx/commit-lint.csx`:

   ```csharp
   /// <summary>
   /// a simple regex commit linter example
   /// https://www.conventionalcommits.org/en/v1.0.0/
   /// https://github.com/angular/angular/blob/22b96b9/CONTRIBUTING.md#type
   /// </summary>

   using System.Text.RegularExpressions;

   private var pattern = @"^(?=.{1,90}$)(?:build|feat|ci|chore|docs|fix|perf|refactor|revert|style|test)(?:\(.+\))*(?::).{4,}(?:#\d+)*(?<![\.\s])$";
   private var msg = File.ReadAllLines(Args[0])[0];

   if (Regex.IsMatch(msg, pattern))
      return 0;

   Console.ForegroundColor = ConsoleColor.Red;
   Console.WriteLine("Invalid commit message");
   Console.ResetColor();
   Console.WriteLine("e.g: 'feat(scope): subject' or 'fix: subject'");
   Console.ForegroundColor = ConsoleColor.Gray;
   Console.WriteLine("more info: https://www.conventionalcommits.org/en/v1.0.0/");

   return 1;
   ```

   Ensure the following task is added to your `task-runner.json` file:

   ```json
   "tasks": [
      {
         "name": "commit-message-linter",
         "command": "dotnet",
         "args": ["husky", "exec", ".husky/csx/commit-lint.csx", "--args", "${args}"]
      }
   ]
   ```


4. **Add a Pre-Commit Hook**

   Create a pre-commit hook to format staged files before committing (⚠️ do not prefix with `.husky/` in the command):

   ```bash
   dotnet husky add pre-commit -c "dotnet husky run --group pre-commit"
   ```

   Ensure the following task is added to your `task-runner.json` file:

   ```json
   "tasks": [
      {
         "name": "dotnet-format",
         "group": "pre-commit",
         "command": "dotnet",
         "args": ["dotnet-format", "--include", "${staged}"],
         "include": ["**/*.cs", "**/*.vb"]
      }
   ]
   ```


5. **Validate Husky Installation**

   To ensure Husky is properly installed and the commit message hook is working:

   1. Switch to a temporary branch:

      ```bash
      git checkout -b temp-validation-branch
      ```

   2. Make a commit with an invalid commit message (should fail):

      ```bash
      echo "Test file" > test.txt
      git add test.txt
      git commit -m "invalid message"
      ```

      If the commit is rejected due to the invalid message, Husky is working correctly.

   3. Make a commit with a valid conventional message (should succeed):

      ```bash
      git commit -m "feat(test): add test file"
      ```

   4. Switch back to your original branch (replace `<original-branch>` with the name of your main branch, e.g. `main` or `master`):

      ```bash
      git checkout <original-branch>
      ```

      To list your branches:
      ```bash
      git branch
      ```

   5. Delete the temporary branch:

      ```bash
      git branch -D temp-validation-branch
      ```

6. **Verify Installation**

   Check that Husky is working by making a commit. The pre-commit hook should run automatically.

## Additional Notes

- You can customize hooks by editing the scripts in the `.husky/` directory.
- Ensure your team members install Husky by running `dotnet husky install` after cloning the repository.
