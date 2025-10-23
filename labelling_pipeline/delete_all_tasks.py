"""
Script to delete all tasks from Label Studio projects while keeping the projects intact.
Also resets all uploaded flags in the database to false.
"""

import os
import argparse
import psycopg2
from label_studio_sdk import Client
from dotenv import load_dotenv

load_dotenv()


def delete_all_tasks_from_projects():
    """Delete all tasks from all Label Studio projects."""
    try:
        # Initialize Label Studio client
        ls = Client(
            url=os.getenv("LABEL_STUDIO_URL"),
            api_key=os.getenv("LABEL_STUDIO_API_KEY"),
        )

        # Get all projects
        projects = ls.get_projects()
        print(f"Found {len(projects)} projects in Label Studio")

        total_tasks_deleted = 0

        for project in projects:
            print(f"\nProcessing project: {project.title} (ID: {project.id})")

            # Get all tasks for this project
            tasks = project.get_tasks()
            task_count = len(tasks)
            print(f"  Found {task_count} tasks in project '{project.title}'")

            if task_count > 0:
                # Delete all tasks
                for task in tasks:
                    try:
                        project.delete_task(task['id'])
                        total_tasks_deleted += 1
                    except Exception as e:
                        print(f"    Error deleting task {task['id']}: {e}")

                print(f"  Deleted {task_count} tasks from project '{project.title}'")
            else:
                print(f"  No tasks to delete in project '{project.title}'")

        print(f"\nTotal tasks deleted across all projects: {total_tasks_deleted}")
        return True

    except Exception as e:
        print(f"Error connecting to Label Studio: {e}")
        return False


def reset_uploaded_flags():
    """Reset all uploaded flags in the database to false."""
    try:
        # Database connection parameters
        conn_params = {
            "user": os.getenv("PGUSER"),
            "password": os.getenv("PGPASSWORD"),
            "host": os.getenv("PGHOST"),
            "port": os.getenv("PGPORT"),
        }

        # Connect to PostgreSQL
        with psycopg2.connect(**conn_params) as conn:
            with conn.cursor() as cur:
                # Reset all uploaded flags to false
                cur.execute("UPDATE image SET uploaded = FALSE")
                rows_affected = cur.rowcount
                conn.commit()

                print(
                    f"Reset uploaded flag to FALSE for {rows_affected} images in database"
                )
                return True

    except Exception as e:
        print(f"Error updating database: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Delete all tasks from Label Studio projects and reset uploaded flags"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be deleted without actually deleting anything",
    )
    parser.add_argument(
        "--skip-label-studio",
        action="store_true",
        help="Skip Label Studio task deletion, only reset database flags",
    )
    parser.add_argument(
        "--skip-database",
        action="store_true",
        help="Skip database flag reset, only delete Label Studio tasks",
    )

    args = parser.parse_args()

    print("Label Studio Task Deletion and Database Reset")

    if args.dry_run:
        print("\nDRY RUN MODE - No changes will be made")
        print("This would:")
        if not args.skip_label_studio:
            print("  - Delete all tasks from all Label Studio projects")
        if not args.skip_database:
            print("  - Reset all uploaded flags to FALSE in database")
        return

    success_count = 0

    # Delete tasks from Label Studio
    if not args.skip_label_studio:
        print("\n1. Deleting tasks from Label Studio projects...")
        if delete_all_tasks_from_projects():
            success_count += 1
        else:
            print("Failed to delete tasks from Label Studio")
    else:
        print("\n1. Skipping Label Studio task deletion (--skip-label-studio)")
        success_count += 1

    # Reset database flags
    if not args.skip_database:
        print("\n2. Resetting uploaded flags in database...")
        if reset_uploaded_flags():
            success_count += 1
        else:
            print("Failed to reset database flags")
    else:
        print("\n2. Skipping database flag reset (--skip-database)")
        success_count += 1

    print("\n" + "=" * 60)
    if success_count == 2:
        print("All operations completed successfully.")
    else:
        print("Some operations failed. Check the output above for details.")


if __name__ == "__main__":
    main()
