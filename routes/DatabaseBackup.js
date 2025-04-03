const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const multer = require("multer");
const router = require("express").Router();
const { Client } = require("pg");
// require('dotenv').config();

// Backup Database Route
router.get("/full-backup-database/main", async (req, res) => {
  // Backup methods in order of preference
  const backupMethods = [pgDumpCommandLineMethod, pgDumpNodeMethod];

  for (const method of backupMethods) {
    try {
      await method(req, res);
      return; // Success, exit the function
    } catch (error) {
      console.error(`Backup method failed:`, error);
      // Continue to next method
    }
  }

  // If all methods fail
  res.status(500).json({
    message: "All backup methods failed",
    error: "Unable to create database backup",
  });
});

async function pgDumpCommandLineMethod(req, res) {
  return new Promise((resolve, reject) => {
    // Validate environment variables
    // if (!process.env.DB_USER || !process.env.DB_NAME) {
    //   return reject(new Error("Database credentials not configured"));
    // }

    const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
    const backupFileName = `database_backup_${timestamp}.sql`;
    const backupDir = path.join(process.cwd(), "database-backups");

    // Ensure backups directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, backupFileName);

    // Determine pg_dump path
    const pgDumpPaths = [
      path.join("D:\\Installations\\Postgree\\bin", "pg_dump.exe"),
      "pg_dump", // System PATH
      path.join(
        "C:",
        "Program Files",
        "PostgreSQL",
        "15",
        "bin",
        "pg_dump.exe"
      ),
      path.join(
        "C:",
        "Program Files (x86)",
        "PostgreSQL",
        "15",
        "bin",
        "pg_dump.exe"
      ),
    ];

    let pgDumpCommand = null;

    // Find first valid pg_dump path
    for (const pgDumpPath of pgDumpPaths) {
      try {
        // Construct backup command with connection details
        const command = `"${pgDumpPath}" -h ${
          process.env.DB_HOST || "localhost"
        } -p ${
          process.env.DB_PORT || 5432
        } -U Harsh -d ${MATOSHREE} -f "${backupPath}"`;

        // Environment with password
        const env = {
          ...process.env,
          PGPASSWORD: Harshv0624,
        };

        // Execute command
        exec(command, { env }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Backup error with ${pgDumpPath}:`, error);
            reject(error);
            return;
          }

          // Check if backup file exists
          if (!fs.existsSync(backupPath)) {
            reject(new Error("Backup file was not created"));
            return;
          }

          // Send backup file
          res.download(backupPath, backupFileName, (err) => {
            if (err) {
              console.error("Download error:", err);
            }

            // Optional: Remove backup file
            try {
              fs.unlinkSync(backupPath);
            } catch (unlinkError) {
              console.error("Error removing backup file:", unlinkError);
            }
          });

          resolve();
        });

        return; // Exit after finding working path
      } catch (pathError) {
        console.error(`Path ${pgDumpPath} failed:`, pathError);
        continue;
      }
    }

    // If no valid path found
    reject(new Error("No valid pg_dump path found"));
  });
}

async function pgDumpCommandLineMethod(req, res) {
  return new Promise((resolve, reject) => {
    // Validate environment variables
    if (!process.env.DB_USER || !process.env.DB_NAME) {
      return reject(new Error("Database credentials not configured"));
    }

    const timestamp = new Date().toISOString().replace(/[:\.]/g, "-");
    const backupFileName = `database_backup_${timestamp}.sql`;
    const backupDir = path.join(process.cwd(), "database-backups");

    // Ensure backups directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupPath = path.join(backupDir, backupFileName);

    // Determine pg_dump path
    const pgDumpPaths = [
      path.join(process.env.POSTGRES_PATH || "", "pg_dump.exe"),
      "pg_dump", // System PATH
      path.join(
        "C:",
        "Program Files",
        "PostgreSQL",
        "15",
        "bin",
        "pg_dump.exe"
      ),
      path.join(
        "C:",
        "Program Files (x86)",
        "PostgreSQL",
        "15",
        "bin",
        "pg_dump.exe"
      ),
    ];

    let pgDumpCommand = null;

    // Find first valid pg_dump path
    for (const pgDumpPath of pgDumpPaths) {
      try {
        // Construct backup command with connection details
        const command = `"${pgDumpPath}" -h ${
          process.env.DB_HOST || "localhost"
        } -p ${process.env.DB_PORT || 5432} -U ${process.env.DB_USER} -d ${
          process.env.DB_NAME
        } -f "${backupPath}"`;

        // Environment with password
        const env = {
          ...process.env,
          PGPASSWORD: process.env.DB_PASS,
        };

        // Execute command
        exec(command, { env }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Backup error with ${pgDumpPath}:`, error);
            reject(error);
            return;
          }

          // Check if backup file exists
          if (!fs.existsSync(backupPath)) {
            reject(new Error("Backup file was not created"));
            return;
          }

          // Send backup file
          res.download(backupPath, backupFileName, (err) => {
            if (err) {
              console.error("Download error:", err);
            }

            // Optional: Remove backup file
            try {
              fs.unlinkSync(backupPath);
            } catch (unlinkError) {
              console.error("Error removing backup file:", unlinkError);
            }
          });

          resolve();
        });

        return; // Exit after finding working path
      } catch (pathError) {
        console.error(`Path ${pgDumpPath} failed:`, pathError);
        continue;
      }
    }

    // If no valid path found
    reject(new Error("No valid pg_dump path found"));
  });
}

// Restore Database Route
const upload = multer({
  dest: "temp-database-backups/",
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

router.post(
  "/database-restore",
  upload.single("backup"),
  async (req, res) => {
    const client = new Client({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 5432,
    });

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No backup file uploaded" });
      }

      const backupFile = req.file.path;

      // Connect to the database
      await client.connect();

      // Read backup file
      const backupSQL = fs.readFileSync(backupFile, "utf8");

      // Begin transaction
      await client.query("BEGIN");

      // Drop all existing tables
      const dropTablesQuery = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
      `);

      for (let table of dropTablesQuery.rows) {
        await client.query(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE`);
      }

      // Execute backup SQL
      await client.query(backupSQL);

      // Commit transaction
      await client.query("COMMIT");

      // Close connection
      await client.end();

      // Remove temporary backup file
      fs.unlinkSync(backupFile);

      res.json({ message: "Database restored successfully" });
    } catch (error) {
      console.error("Restore failed:", error);
      res.status(500).json({
        message: "Restore failed",
        error: error.message,
      });
    }
  }
);

// Optional: Backup Logging Route
router.get("/backup-logs", async (req, res) => {
  try {
    const backupDir = path.join(process.cwd(), "database-backups");

    // Get list of existing backups
    const backupFiles = fs
      .readdirSync(backupDir)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
        };
      })
      .sort((a, b) => b.created - a.created); // Sort by most recent first

    res.json(backupFiles);
  } catch (error) {
    console.error("Failed to retrieve backup logs:", error);
    res.status(500).json({
      message: "Failed to retrieve backup logs",
      error: error.message,
    });
  }
});

module.exports = router;
