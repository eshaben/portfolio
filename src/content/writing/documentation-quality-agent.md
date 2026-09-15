---
title: "Building a Documentation Quality Agent"
description: "A step-by-step guide to building a Claude-powered agent that checks a Markdown doc's code claims against a real reference repo, and the tool-design and agentic-loop concepts behind it."
pubDate: 2026-09-14
tags: ["Guide"]
featured: true
draft: false
---

This is a step-by-step guide to building a Claude-powered agent that reads a Markdown doc, checks its code-related claims against a real reference repository, and reports back what's inaccurate.

Docs drift from code constantly whether an API changes, a default value gets updated, a parameter gets renamed, or the README never catches up. And it isn't just existing docs going stale: a newly written doc can make claims that were never accurate to begin with. Checking either case by hand isn't scalable.

By the end of this guide, you'll have a working agent, and you'll understand how its two core pieces work: designing the interface Claude uses to call out to your code (a [tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview.md), in Claude API terms) around what the model can decide versus what your own code already knows, and writing the agentic loop that lets Claude call those tools until it's ready to answer.

A full working implementation of everything below is at [github.com/eshaben/documentation-quality-agent](https://github.com/eshaben/documentation-quality-agent), if you want a complete reference alongside this guide.

## Prerequisites

- A [Claude API](https://platform.claude.com) account with billing enabled, and an API key generated from it
- Python 3.12+
- [`git` installed](https://git-scm.com/install/)

## Project Setup

1. Create a project directory and a virtual environment:
    ```bash
    mkdir doc-quality-agent && cd doc-quality-agent
    python3 -m venv venv
    source venv/bin/activate
    ```

2. Install dependencies:
    ```bash
    pip install anthropic python-dotenv
    ```

3. Create `agent.py` in the project root. This is the one file everything in this guide builds up:
    ```bash
    touch agent.py
    ```

4. Store your API key in a `.env` file in the project root:
    ```
    ANTHROPIC_API_KEY=INSERT_API_KEY
    ```

    Never hardcode or commit your API key. Add `.env` to `.gitignore` before your first commit.

5. Load it at the top of `agent.py`:
    ```python
    from dotenv import load_dotenv
    load_dotenv()

    import anthropic
    client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from the environment
    ```

## Scaffold the Entry Point

Start with a function that accepts the two things the whole agent revolves around:

- A Markdown file to check
- A path to the reference repo to check it against

```python
def audit_doc(doc_path: Path, repo_path: str):
    ...
```

Having this signature first gives every later piece something concrete to plug into.

## Write the Agent's Instructions

This is the system prompt, the only place you tell Claude what its job is:

```python
instructions = (
    "You are a documentation quality auditor. "
    "You'll be given a Markdown document and access to a reference repository.\n\n"
    "Check every code-related claim in the document against the actual repository. "
    "Use the search_code tool to find relevant code, and the read_file tool to inspect it in full.\n\n"
    "Flag any mismatches between what the document says and what the code actually does.\n\n"
    "When you're done auditing the entire document, report each inaccurate claim you found: "
    "what the document says, what the code actually shows, and the file and line number as reference."
)
```

Two things worth doing here, not just for style:

- **Structure it into distinct blocks** (role, task, flagging behavior, output format), separated by real `\n\n`, instead of one dense paragraph. Claude tends to parse a system prompt more reliably when the separate ideas in it are visibly separate.
- **Name your tools in the prose** ("Use the `search_code` tool... the `read_file` tool...") even though the tool schemas (next step) already describe them. The instructions are where you tell Claude *when* and *why* to reach for each one; the schema is where you tell it *how*.

## Design and Build the Tools

A **tool** is made of two halves that are easy to conflate:

- A **Python function** that actually does something (reads a file, runs a search).
- A **JSON schema** that describes that function to Claude, since Claude never sees your Python code, the schema is the *only* information it has about what the tool does and what arguments it takes.

### The Core Design Rule: What Goes in the Schema, and What Doesn't

Every tool in this agent needs to know *which repository* to operate on (`repo_path`), but `repo_path` should **never** appear in a tool's schema. Here's why: Claude never sees the real filesystem path where the repo got cloned (it's decided at runtime by your CLI code, long after Claude starts reasoning about the doc). If `repo_path` were a schema field, Claude would have to guess a plausible-looking value, which is either wrong, or an invitation to point your filesystem operations somewhere unintended.

The rule that falls out of this: **only include what Claude can actually decide** in a tool's schema. Anything your own code already knows, and that doesn't change between calls, gets supplied by your dispatch logic instead, merged in right before the real function runs.

### The `search_code` Function

The first tool answers "where does this live?": given a search term, find which files even mention it. This is what lets Claude go from a vague claim in the doc ("the client retries failed requests") to an actual file, without already knowing where that logic lives.

```python
def search_code(repo_path, pattern):
    result = subprocess.run(
        ["git", "grep", "-n", pattern], cwd=repo_path, capture_output=True, text=True
    )

    if result.returncode == 0:
        return result.stdout
    elif result.returncode == 1:
        return f"No matches found for: {pattern}"
    else:
        return result.stderr
```

A few decisions baked into this that are worth calling out:

- **`git grep`, not plain `grep`.** The repo is already a git clone, so `git grep` gets you fast, `.gitignore`-aware search across the whole repo for free, no need to recurse manually (`git grep` is inherently repo-wide, unlike plain `grep`, which needs `-r` and a starting directory).
- **The command is a list of args, not a shell string.** `pattern` comes from Claude, so building the command via string interpolation into a shell would open you up to shell injection. `subprocess.run([...])` with a list avoids that entirely.
- **`capture_output=True, text=True`** captures the subprocess's stdout/stderr into memory as strings (not bytes), instead of letting them print straight to your terminal.
- **The three-way branch on `returncode` matters.** `git grep`'s exit code convention is: `0` = matches found, `1` = ran fine, nothing matched (**not** an error), anything else = an actual problem (bad pattern, not a git repo).
- **Every branch returns a string, never raises.** The return value goes straight back to Claude as tool output. If something fails, Claude needs to *see* a clear error message and adjust, not have the whole loop crash.

> **Warning:** Don't pass `check=True` to `subprocess.run` here. That would make Python raise an exception the moment nothing matches, which defeats the three-way branching above, since a `git grep` exit code of `1` is a normal outcome, not a failure.

### The `search_code` Schema

```python
{
    "name": "search_code",
    "description": "Searches the reference repository for a pattern and returns any matching lines with the file and line number.",
    "input_schema": {
        "type": "object",
        "properties": {
            "pattern": {
                "type": "string",
                "description": "The term or code pattern to search for, e.g. a function name, variable, or string.",
            }
        },
        "required": ["pattern"],
    },
}
```

Notice `repo_path` isn't in here: only `pattern`, the one thing Claude actually decides. The `description` fields aren't just documentation, either; they're doing real work; a vague or thin description directly hurts how well Claude picks and uses the tool.

### The `read_file` Function

The second tool answers the opposite question: "what does the code actually say, at a specific location?" Once Claude has a file path (from a `search_code` result, or because the doc names it directly), this reads the whole thing.

```python
def read_file(repo_path, file_path):
    absolute_repo_path = Path(repo_path).resolve()
    resolved_file_path = (absolute_repo_path / file_path).resolve()

    if not resolved_file_path.is_relative_to(absolute_repo_path):
        return f"Error: {file_path} is outside the repository."
    if not resolved_file_path.exists():
        return f"Error: {file_path} does not exist."

    try:
        return resolved_file_path.read_text()
    except UnicodeDecodeError:
        return f"Error: {file_path} is not a text file."
```

The security check here is the important part, and it's worth understanding exactly what it's defending against. `file_path` comes from Claude, which means, directly or through a confused model, it could be something like `../../etc/passwd`. Two things make the check work:

- **`.resolve()` collapses `..` segments and follows symlinks**, converting anything relative or tricky into a real, absolute, canonical path. Try it yourself: joining a repo root with `../../etc/passwd` and resolving the result doesn't leave the `..` sitting in the string; it actually walks up two directories, landing somewhere clearly outside the repo.
- **`is_relative_to()` then checks containment**: is the resolved file path still underneath the resolved repo root? Both sides need to be resolved for this comparison to mean anything; comparing a resolved path against an unresolved one (or a raw string prefix check) can be fooled.

> **Warning:** Check `is_relative_to` **before** `exists()`, not after. Checking existence first confirms "yes, this file exists" for paths outside the sandbox before you've even decided whether to allow them. That's a small information leak, and it means the guard isn't really gatekeeping anything.

### The `read_file` Schema

Same shape as `search_code`'s, with `file_path` as the one Claude-supplied field:

```python
{
    "name": "read_file",
    "description": "Reads the full contents of a specific file in the reference repository, given a path relative to the repository root.",
    "input_schema": {
        "type": "object",
        "properties": {
            "file_path": {
                "type": "string",
                "description": "Path to the file, relative to the repository root, often found via a search_code result.",
            }
        },
        "required": ["file_path"],
    },
}
```

### Assemble the Tools List

Both schemas live in one list, passed to the API as `tools=`:

```python
tools = [
    { "name": "search_code", ... },
    { "name": "read_file", ... },
]
```

### Test Each Tool Standalone Before Wiring Anything Up

Before either function ever touches the agent loop, call it directly with a real, persistent test repo (clone a real project somewhere stable, not a temp directory that self-deletes) and a few hand-picked inputs:

```python
>>> from agent import search_code, read_file
>>> search_code("some-repo", "max_tokens")        # a pattern that should match
>>> search_code("some-repo", "definitely_not_real") # no matches
>>> search_code("/tmp", "anything")                 # not a git repo, error path
>>> read_file("some-repo", "src/client.py")         # a real file
>>> read_file("some-repo", "../../etc/passwd")      # traversal attempt, should be blocked
```

This matters more than it might seem: testing through the full agent means Claude decides what pattern to search for, so if something looks wrong you can't easily tell whether the bug is in your function or in what Claude happened to ask for. Calling the function directly, with inputs you chose, is a much faster and more precise feedback loop.

> **Note:** Python only loads a function once, at import time. If you edit `agent.py` after importing, your REPL is still holding the old version. Restart it, or use `importlib.reload(...)`.

---

## Read the Doc, Make the First API Call

Back in `audit_doc`:

```python
doc_contents = doc_path.read_text()

messages = [{"role": "user", "content": doc_contents}]

response = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=4096,
    messages=messages,
    system=instructions,
    tools=tools,
    tool_choice={"type": "auto"},
)
```

Notes on the pieces:

- **`max_tokens`** caps a single response, not the whole run. Most turns in this loop are small (a short tool request); the one turn that needs headroom is the final report. You're not charged for unused headroom, only for what Claude actually generates, so it's better to be generous than to have a response cut off mid-report.
- **`messages` starts with one entry**: the doc's full contents, as a `"user"` message. This list grows as the loop runs.

At this point, `response.stop_reason` tells you what happened: `"tool_use"` means Claude decided it needs to call a tool before it can continue.

---

## Build the Agentic Loop

This is where the doc actually gets audited. Keep looping as long as Claude keeps asking for tools:

```python
def run_tool(name, tool_input, repo_path):
    if name == "search_code":
        return search_code(repo_path, tool_input["pattern"])
    elif name == "read_file":
        return read_file(repo_path, tool_input["file_path"])
    return f"Error: Unknown tool: {name}"


while response.stop_reason == "tool_use":
    # A single response can contain multiple tool_use blocks. Handle all of
    # them, and return all results together in one user message.
    tool_results = []
    for block in response.content:
        if block.type == "tool_use":
            result = run_tool(block.name, block.input, repo_path)
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": result,
            })

    messages.append({"role": "assistant", "content": response.content})
    messages.append({"role": "user", "content": tool_results})

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=4096,
        messages=messages,
        system=instructions,
        tools=tools,
        tool_choice={"type": "auto"},
    )
```

> **Warning:** If Claude requests multiple tools in a single turn (parallel tool use, the default), the API requires a matching `tool_result` for *each* one, and they must all be packaged into a single `"user"`-role message's `content` list, exactly as the loop above does. Splitting them across multiple messages, or leaving one unanswered, breaks the next call.

A few more mechanics that are easy to get wrong the first time:

- **Record Claude's turn before you respond to it.** `response.content` (which can include a `ThinkingBlock` alongside the `ToolUseBlock`) has to go into `messages` before you call the API again; otherwise the next call has no idea a tool was ever requested. The API is stateless between calls; it only knows what's in `messages`.
- **`response.content` is a list of mixed block types.** Filter for `block.type == "tool_use"` rather than assuming it's the only thing in there.
- **`tool_use_id` is how Claude matches a result back to its request.** Set it from `block.id`, not anything you generate yourself.
- **`repo_path` gets merged in by your dispatch code, not sent by Claude.** `run_tool` takes `repo_path` as a parameter your loop already has (it's an argument to `audit_doc`) and combines it with whatever Claude supplied in `tool_input`. This is the same "your code supplies fixed context, Claude supplies its decision" split described earlier.

## Extract and Print the Final Report

Once the loop exits, `stop_reason` is no longer `"tool_use"`. Claude is done investigating and has written its report as plain text:

```python
final_text = next(block for block in response.content if block.type == "text")
print(final_text.text)
```

<details>
<summary>View the complete <code>agent.py</code></summary>

```python
import anthropic
import subprocess
from dotenv import load_dotenv
from pathlib import Path

load_dotenv()

client = anthropic.Anthropic()

instructions = (
    "You are a documentation quality auditor. "
    "You'll be given a Markdown document and access to a reference repository.\n\n"
    "Check every code-related claim in the document against the actual repository. "
    "Use the search_code tool to find relevant code, and the read_file tool to inspect it in full.\n\n"
    "Flag any mismatches between what the document says and what the code actually does.\n\n"
    "When you're done auditing the entire document, report each inaccurate claim you found: "
    "what the document says, what the code actually shows, and the file and line number as reference."
)

tools = [
    {
        "name": "search_code",
        "description": "Searches the reference repository for a pattern and returns any matching lines with the file and line number.",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "description": "The term or code pattern to search for, e.g. a function name, variable, or string.",
                }
            },
            "required": ["pattern"],
        },
    },
    {
        "name": "read_file",
        "description": "Reads the full contents of a specific file in the reference repository, given a path relative to the repository root.",
        "input_schema": {
            "type": "object",
            "properties": {
                "file_path": {
                    "type": "string",
                    "description": "Path to the file, relative to the repository root, often found via a search_code result.",
                }
            },
            "required": ["file_path"],
        },
    },
]


def search_code(repo_path, pattern):
    result = subprocess.run(
        ["git", "grep", "-n", pattern], cwd=repo_path, capture_output=True, text=True
    )

    if result.returncode == 0:
        return result.stdout
    elif result.returncode == 1:
        return f"No matches found for: {pattern}"
    else:
        return result.stderr


def read_file(repo_path, file_path):
    absolute_repo_path = Path(repo_path).resolve()
    resolved_file_path = (absolute_repo_path / file_path).resolve()

    if not resolved_file_path.is_relative_to(absolute_repo_path):
        return f"Error: {file_path} is outside the repository."
    if not resolved_file_path.exists():
        return f"Error: {file_path} does not exist."

    try:
        return resolved_file_path.read_text()
    except UnicodeDecodeError:
        return f"Error: {file_path} is not a text file."


def run_tool(name, tool_input, repo_path):
    if name == "search_code":
        return search_code(repo_path, tool_input["pattern"])
    elif name == "read_file":
        return read_file(repo_path, tool_input["file_path"])
    return f"Error: Unknown tool: {name}"


def audit_doc(doc_path: Path, repo_path: str):
    doc_contents = doc_path.read_text()

    messages = [{"role": "user", "content": doc_contents}]

    response = client.messages.create(
        model="claude-sonnet-5",
        max_tokens=4096,
        messages=messages,
        system=instructions,
        tools=tools,
        tool_choice={"type": "auto"},
    )

    while response.stop_reason == "tool_use":
        tool_results = []
        for block in response.content:
            if block.type == "tool_use":
                result = run_tool(block.name, block.input, repo_path)
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": result,
                })

        messages.append({"role": "assistant", "content": response.content})
        messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=4096,
            messages=messages,
            system=instructions,
            tools=tools,
            tool_choice={"type": "auto"},
        )

    final_text = next(block for block in response.content if block.type == "text")
    print(final_text.text)
```

</details>

---

## Testing the Whole Thing End to End

Clone a real repo somewhere stable (not a self-deleting temp directory; see the note above on why), then call `audit_doc` directly against a doc that makes claims about it:

```python
from pathlib import Path
from agent import audit_doc
audit_doc(Path("examples/some_doc.md"), "path/to/a/cloned/repo")
```

This exercises every piece built above: the doc gets read, Claude decides what to check, the loop runs `search_code`/`read_file` as many times as it needs, and the final report prints. Something roughly like this, depending on what the doc claims and what the code actually shows:

```
1. Claim: "If you omit `max_tokens`, it defaults to 1024."
   Reality: src/client.py:342, `max_tokens` is a required parameter with no default value.

2. Claim: "The client retries failed requests automatically."
   Reality: No retry logic found in src/client.py or src/_base_client.py.
```

From here, wrapping `audit_doc` in a CLI that accepts a doc path and a GitHub URL, clones the repo into a temp directory, and calls `audit_doc` with the result is a natural next step. The [example repo](https://github.com/eshaben/documentation-quality-agent) linked above does exactly that (see `cli.py` and the `docs-audit` entry point in `pyproject.toml`) if you want a reference for that piece too.

## Where to Go From Here

- **Parallel tool calls** (shown above) let Claude batch independent investigations, e.g., searching for two unrelated claims at once, instead of one strict round-trip per claim.
- **The Tool Runner SDK helper** (`client.beta.messages.tool_runner`, beta) is a drop-in alternative to hand-writing this loop: decorate your tool functions with `@beta_tool`, and it generates the schema from the function signature and handles the loop for you. Worth knowing about, but hand-rolling the loop first (as this guide does) is what actually teaches you the mechanics. The API doesn't change shape under the abstraction, it just hides it.
