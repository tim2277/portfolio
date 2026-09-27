using './main.bicep'

param name = 'swa-portfolio'
param location = 'westeurope'
param tags = {
  workload: 'portfolio'
  environment: 'production'
  managedBy: 'bicep'
}
