import subprocess
import sys
import os
import datetime

# Ensure UTF-8 output encoding on Windows
if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'


def run_git_automation():
    # Accept an optional commit message as the first argument
    if len(sys.argv) > 1:
        commit_msg = " ".join(sys.argv[1:])
    else:
        # Default: timestamp-based message so history is always traceable
        ts = datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        commit_msg = f"update: site content [{ts}]"

    print(f"Commit message: '{commit_msg}'")

    try:
        # Stage only tracked changes (safer than 'git add .')
        # Use 'git add -u' to stage modifications/deletions of tracked files only
        print("--- Staging tracked changes ---")
        subprocess.run(["git", "add", "-u"], check=True)

        # Also stage new source files and configuration intentionally (ignoring .env/backups via .gitignore)
        subprocess.run(
            [
                "git", "add", 
                "src/", "public/", "lang/", 
                "astro.config.mjs", "package.json", "package-lock.json", 
                "server.js", "netlify.toml", "sitemap.xml", "robots.txt", "*.html"
            ],
            check=True
        )

        # Check if there's anything to commit
        result = subprocess.run(
            ["git", "diff", "--cached", "--quiet"],
            capture_output=True
        )
        if result.returncode == 0:
            print("Nothing to commit — working tree clean.")
            sys.exit(0)

        print("--- Committing ---")
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)

        print("--- Pushing to origin main ---")
        subprocess.run(["git", "push", "origin", "main"], check=True)

        print("\nSuccess: Changes pushed to main.")

    except subprocess.CalledProcessError as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    run_git_automation()