import { Preferences } from '@capacitor/preferences';
import { isValidStateShape } from './state/migrations.js';

async function rehydrateLocalStorage() {
  try {
    // Re-hydrate grades state
    const stateVal = await Preferences.get({ key: 'gymnase_vaud_state_v5' });
    if (stateVal.value) {
      const parsed = JSON.parse(stateVal.value);
      if (isValidStateShape(parsed)) {
        localStorage.setItem('gymnase_vaud_state_v5', stateVal.value);
      }
    }
    
    // Re-hydrate registered students profiles database
    const profileVal = await Preferences.get({ key: 'notare_registered_students' });
    if (profileVal.value) {
      localStorage.setItem('notare_registered_students', profileVal.value);
    }
  } catch (err) {
    console.error("Storage rehydration failed:", err);
  }
}

async function bootstrap() {
  await rehydrateLocalStorage();
  
  // Dynamically import the main app code only after localStorage is ready
  await import('./main.js');
}

bootstrap();
