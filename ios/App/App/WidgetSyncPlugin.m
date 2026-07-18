#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetSyncPlugin, "WidgetSyncPlugin",
  CAP_PLUGIN_METHOD(writeWidgetData, CAPPluginReturnPromise);
)
