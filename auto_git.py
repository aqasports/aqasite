import subprocess
import random
import sys

def get_random_commit_message():
    """Generates a random commit message from a predefined list."""
    messages = [
        "Fixed a bug that I created",
        "Updated the code logic",
        "Minor refactoring",
        "WIP: Making progress",
        "Cleaned up some messy code",
        "Optimized performance",
        "Updates for the main branch",
        "Squashing bugs",
        "Another day, another commit",
        "Code compilation magic"
    ]
    return random.choice(messages)

def run_git_automation():
    # 1. Generate the random message
    commit_msg = get_random_commit_message()
    print(f"🚀 Preparing to commit with message: '{commit_msg}'")

    try:
        # 2. git add .
        print("--- Adding files ---")
        subprocess.run(["git", "add", "."], check=True)

        # 3. git commit -m "..."
        print("--- Committing ---")
        subprocess.run(["git", "commit", "-m", commit_msg], check=True)

        # 4. git push origin main
        print("--- Pushing to origin main ---")
        subprocess.run(["git", "push", "origin", "main"], check=True)
        
        print("\n✅ Success! Changes pushed to main.")

    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error occurred: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_git_automation()