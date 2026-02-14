@echo off
REM Long-Running Agent Framework CLI
REM Usage: lra init [project-path]

set FRAMEWORK_ROOT=D:\long-running-agent-framework

if "%1"=="" goto usage
if "%1"=="init" goto init
if "%1"=="status" goto status
if "%1"=="prompt" goto prompt
goto usage

:init
if "%2"=="" (
    set PROJECT_PATH=%CD%
) else (
    set PROJECT_PATH=%2
)

echo Initializing Long-Running Agent Framework...
echo Project path: %PROJECT_PATH%

REM Create .agent directory
if not exist "%PROJECT_PATH%\.agent" mkdir "%PROJECT_PATH%\.agent"
if not exist "%PROJECT_PATH%\.agent\screenshots" mkdir "%PROJECT_PATH%\.agent\screenshots"
if not exist "%PROJECT_PATH%\.agent\console-logs" mkdir "%PROJECT_PATH%\.agent\console-logs"

REM Copy template files
copy "%FRAMEWORK_ROOT%\examples\web-app-template\.agent\agent_state.json" "%PROJECT_PATH%\.agent\" >nul 2>&1
copy "%FRAMEWORK_ROOT%\templates\feature-list.json" "%PROJECT_PATH%\.agent\feature_list.json" >nul 2>&1

REM Create init.sh if not exists
if not exist "%PROJECT_PATH%\init.sh" (
    echo #!/bin/bash > "%PROJECT_PATH%\init.sh"
    echo npm run dev >> "%PROJECT_PATH%\init.sh"
)

REM Create CLAUDE.md template if not exists
if not exist "%PROJECT_PATH%\CLAUDE.md" (
    echo # Project: [Your Project Name] > "%PROJECT_PATH%\CLAUDE.md"
    echo. >> "%PROJECT_PATH%\CLAUDE.md"
    echo ## Description >> "%PROJECT_PATH%\CLAUDE.md"
    echo [Describe your project here] >> "%PROJECT_PATH%\CLAUDE.md"
    echo. >> "%PROJECT_PATH%\CLAUDE.md"
    echo ## Tech Stack >> "%PROJECT_PATH%\CLAUDE.md"
    echo - [List your tech stack] >> "%PROJECT_PATH%\CLAUDE.md"
)

echo.
echo ========================================
echo Framework initialized successfully!
echo ========================================
echo.
echo Project structure:
echo   %PROJECT_PATH%
echo   ├── .agent/
echo   │   ├── agent_state.json
echo   │   ├── feature_list.json
echo   │   ├── screenshots/
echo   │   └── console-logs/
echo   ├── init.sh
echo   └── CLAUDE.md
echo.
echo Next steps:
echo   1. Edit CLAUDE.md with your project details
echo   2. Define features in .agent/feature_list.json
echo   3. Run: claude --prompt-file %FRAMEWORK_ROOT%\agents\coding-agent-enhanced.md
echo.
goto end

:status
echo Checking project status...
if exist ".agent\agent_state.json" (
    type ".agent\agent_state.json"
) else (
    echo Not initialized. Run: lra init
)
goto end

:prompt
echo.
echo Available agent prompts:
echo   coding     - Coding agent (enhanced with 4-step workflow)
echo   coding-basic - Basic coding agent
echo   initializer - Project initialization agent
echo   testing    - Testing agent
echo.
if "%2"=="coding" (
    echo Prompt file: %FRAMEWORK_ROOT%\agents\coding-agent-enhanced.md
    echo.
    echo Run: claude --prompt-file "%FRAMEWORK_ROOT%\agents\coding-agent-enhanced.md"
)
if "%2"=="initializer" (
    echo Prompt file: %FRAMEWORK_ROOT%\agents\initializer-agent-enhanced.md
)
goto end

:usage
echo.
echo Long-Running Agent Framework CLI
echo.
echo Usage:
echo   lra init [path]     Initialize framework in project (default: current dir)
echo   lra status          Show current project status
echo   lra prompt [type]   Show agent prompt file path
echo.
echo Examples:
echo   lra init                    # Initialize in current directory
echo   lra init D:\my-project      # Initialize in specific directory
echo   lra status                  # Check project status
echo   lra prompt coding           # Get coding agent prompt path
echo.

:end
