module.exports = {
  images: {
    domains: [
      'wboanimgfdyxdnutsuhl.supabase.co', // Supabase storage domain
      'lh3.googleusercontent.com', // Google profile images
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Add configuration to help with chunk loading issues
  output: 'standalone',
}; 