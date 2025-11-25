export interface SystemStats {
  totalDevices: number
  totalPoints: number
  totalUsers: number
  activeDevices: number
  monitoringPoints: number
  databaseSize: string
  lastBackup: string
}

export interface BackupInfo {
  lastBackup: string
  backupSize: string
  autoBackup: boolean
  backupLocation: string
}
