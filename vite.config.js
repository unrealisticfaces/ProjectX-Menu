import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './', // <-- Add this line right here!
  plugins: [react()],
})