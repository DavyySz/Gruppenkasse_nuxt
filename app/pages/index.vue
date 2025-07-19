<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-100">
    <div class="w-full max-w-md bg-white p-6 rounded-xl shadow-lg">
      <h1 class="text-2xl font-bold text-black mb-6 text-center">Hallo, melde dich an</h1>
      
      <form @submit.prevent="handleSubmit">
        <div class="mb-4">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
          />
        </div>

        <div class="mb-4">
          <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Passwort</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black placeholder-black"
          />
        </div>

        <div v-if="error" class="mb-4 text-sm text-red-600">
          {{ error }}
        </div>

        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition duration-200"
        >
          Anmelden
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const email = ref('')
const password = ref('')
const error = ref('')

const handleSubmit = () => {
  error.value = ''

  if (!email.value || !password.value) {
    error.value = 'Bitte alle Felder ausfüllen.'
    return
  }

  if (email.value === 'demo@example.com' && password.value === 'passwort123') {
    alert('Login erfolgreich!')
  } else {
    error.value = 'Falsche Zugangsdaten.'
  }
}
</script>
