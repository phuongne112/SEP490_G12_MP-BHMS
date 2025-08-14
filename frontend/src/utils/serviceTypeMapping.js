// Utility function to map service types to Vietnamese names
export const getServiceTypeDisplayName = (serviceType) => {
  const typeMapping = {
    'ELECTRICITY': 'Điện',
    'WATER': 'Nước',
    'OTHER': 'Khác'
  };
  
  return typeMapping[serviceType] || serviceType;
};
