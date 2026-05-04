function performRTDBBackup() {
  if (!firebaseDb) return;
  console.log(`⏰ [${new Date().toLocaleTimeString()}] Triggering JSON Snapshot Backup to RTDB...`);

  const db = new sqlite3.Database(localDbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Could not open local database:", err.message);
      return;
    }
  });

  // Read all Users and Orders from SQLite
  db.serialize(() => {
    db.all("SELECT * FROM users", [], (err, usersRows) => {
      if (err) return console.error("Error reading users:", err.message);

      db.all("SELECT * FROM orders", [], (err, ordersRows) => {
        if (err) return console.error("Error reading orders:", err.message);

        // Format as a JSON Snapshot
        const backupSnapshot = {
          last_backup_time: new Date().toLocaleString(),
          timestamp: Date.now(),
          data: {
            users: usersRows || [],
            orders: ordersRows || []
          }
        };

        // Push to Firebase RTDB
        firebaseDb.ref('server_backup/latest').set(backupSnapshot)
          .then(() => {
            console.log(`✅ Success: Local Data synced to Firebase RTDB!`);
          })
          .catch((error) => {
            console.error(`❌ Firebase Sync Failed:`, error.message);
          })
          .finally(() => {
            // Close the database safely AFTER the sync is complete
            db.close(); 
          });
      });
    });
  });
}