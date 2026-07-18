import { registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Clipboard } from '@capacitor/clipboard';
import { queuePreferencesWrite, replaceState } from '../state/store.js';
import { isValidStateShape } from '../state/migrations.js';
import { showSidebarToast } from '../ui/effects.js';

// Constant ID for promotion warnings
const PROMOTION_WARNING_NOTIFICATION_ID = 1001;

// Define WidgetSyncPlugin Interface
const WidgetSync = registerPlugin('WidgetSyncPlugin');

/**
 * Checks and requests Local Notification permissions if not already granted.
 */
async function checkAndRequestPermissions() {
  try {
    const status = await LocalNotifications.checkPermissions();
    if (status.display !== 'granted') {
      const request = await LocalNotifications.requestPermissions();
      return request.display === 'granted';
    }
    return true;
  } catch (err) {
    console.error("Failed to check/request notifications permissions:", err);
    return false;
  }
}

/**
 * Schedules a local notification warning reminder delayed by 24 hours.
 */
async function scheduleWarningNotification(overallAverage) {
  const isAllowed = await checkAndRequestPermissions();
  if (!isAllowed) return;

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: PROMOTION_WARNING_NOTIFICATION_ID,
          title: "Suivi de Promotion Notare",
          body: `Attention, vos moyennes actuelles ne remplissent plus les conditions de promotion (Moyenne: ${overallAverage.toFixed(2)}).`,
          schedule: { at: new Date(Date.now() + 24 * 60 * 60 * 1000) } // 24 hours delay
        }
      ]
    });
  } catch (err) {
    console.error("Failed to schedule local notification:", err);
  }
}

/**
 * Cancels and clears the promotion warning notification from both scheduled queue and system tray.
 */
async function clearWarningNotification() {
  try {
    await LocalNotifications.cancel({
      notifications: [{ id: PROMOTION_WARNING_NOTIFICATION_ID }]
    });
    await LocalNotifications.removeDeliveredNotifications({
      notifications: [{ id: PROMOTION_WARNING_NOTIFICATION_ID }]
    });
  } catch (err) {
    console.error("Failed to clear local notifications:", err);
  }
}

/**
 * Native Widget Group Synchronizer.
 */
export async function syncNativeWidget(overallAverage, isPromoted, insuffisances) {
  try {
    const promotionStatus = isPromoted ? "Promu" : "Non promu";
    await WidgetSync.writeWidgetData({
      overallAverage: overallAverage || 0.0,
      promotionStatus,
      failingGradesCount: insuffisances || 0
    });
  } catch (err) {
    console.warn("Native widget synchronization skipped or failed:", err);
  }
}

/**
 * Handles PWA backup JSON clipboard data migration with full UX and schema validation checks.
 */
export async function handleImportFromWeb() {
  try {
    // Explicit clipboard permission check
    const check = await Clipboard.read();
    if (!check || !check.value) {
      showSidebarToast("Le presse-papier est vide. Veuillez copier votre sauvegarde dans Safari puis réessayez.", 'error');
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(check.value);
    } catch (e) {
      showSidebarToast("Données invalides : le presse-papier ne contient pas un fichier JSON valide.", 'error');
      return;
    }

    if (!isValidStateShape(parsed)) {
      showSidebarToast("Données invalides : le presse-papier ne correspond pas au format attendu de Notare.", 'error');
      return;
    }

    // Success path: import data and immediately sync preferences backup
    replaceState(parsed);
    await queuePreferencesWrite(parsed);
    
    // Check if registered students profiles database also was copied
    const regStudentsVal = localStorage.getItem('notare_registered_students');
    if (regStudentsVal) {
      try {
        await queuePreferencesWrite(null, JSON.parse(regStudentsVal));
      } catch (e) {}
    }

    showSidebarToast("Sauvegarde importée avec succès !", 'success');
    setTimeout(() => {
      window.location.reload();
    }, 1500);

  } catch (err) {
    console.error("Clipboard migration failed:", err);
    showSidebarToast("Accès au presse-papier refusé. Veuillez autoriser l'accès ou importer un fichier directement.", 'error');
  }
}

/**
 * Initializes AppState event listeners and clears system tray warning notifications on launch.
 */
export function initNativeIntegration(getCurrentState) {
  // Clear any warnings immediately upon foregrounding/booting
  clearWarningNotification();

  // Lifecycle listeners
  App.addListener('appStateChange', async (state) => {
    if (state.isActive) {
      // Clear delivered notifications when user opens app
      await clearWarningNotification();
    } else {
      // Backgrounding transition checks
      try {
        const appState = getCurrentState();
        if (appState && appState.results) {
          if (!appState.results.isPromoted && appState.results.activeSubjectsCount > 0) {
            await scheduleWarningNotification(appState.results.overallAverage);
          } else {
            await clearWarningNotification();
          }
        }
      } catch (e) {
        console.error("Error handling background lifecycle notifications:", e);
      }
    }
  });
}
