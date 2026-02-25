/// <summary>
/// Conventional Commits validator for Husky hooks in .NET projects
/// Strictly enforces format: type(optional-scope): description
/// 
/// Spec: https://www.conventionalcommits.org/en/v1.0.0/
/// This validator adds team-specific strictness (1-90 chars, 4+ desc chars, no trailing period)
/// </summary>
/// 
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