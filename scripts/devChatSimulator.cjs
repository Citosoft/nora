const { app } = require('electron');
const { createChatSimulator } = require('./ui/chatSimulatorHost.cjs');
let simulator;
let quitting = false;
app.on('window-all-closed', async () => {
  if (quitting) return; quitting = true;
  await simulator?.close(); app.quit();
});
createChatSimulator({ visible: true, watch: true }).then(host => {
  simulator = host;
  console.log('Chat simulator ready. Choose a scenario and press Send. No LLM requests or real tool execution.');
  console.log('UI and styles reload automatically. Backend/provider changes require a restart.');
}).catch(error => { console.error(error); app.exit(1); });
