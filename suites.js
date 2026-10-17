/* FIF Suite Registry: the product-line framework.
 *
 * The app shell (app.js) knows nothing about DSP. Each suite is a self-contained
 * signal chain that plugs in through this registry and appears as a choice on
 * the startup screen. To add a future suite: create a new file that calls
 * FIFSuites.register({...}) and include it in index.html. No shell changes needed.
 *
 * Suite contract (all fields required):
 *   id          unique string, e.g. "vocal-nine"
 *   name        display name, e.g. "Vocal Nine"
 *   description one or two sentences for the startup picker
 *   stages      ordered list of stage names (shown in the picker + docs)
 *   patents     pointer to the suite's patent ledger, e.g. "PATENTS.md"
 *   cardsHTML   the suite's control cards, injected into #suiteCards
 *   create      function (shell) -> instance
 *
 * Instance contract (used by the shell):
 *   build()                  create AudioContext nodes (called once after ctx exists)
 *   bind()                   wire the injected cards' controls (called once)
 *   connect(src, dest, tap)  wire src -> chain -> dest, plus chain -> tap (recorder)
 *   disconnect()             tear the chain down
 *   tick()                   per-frame control-rate work; returns {dIn, dOut, gr} in dB
 *   presets()                [{id, label}] for the shell's preset picker
 *   applyPreset(id)          load a preset
 *
 * Shell services passed to create(shell):
 *   ctx, $, dbToGain, fmtDb, fmtHz, rebuild(), srcNode()
 */
(function (global) {
  "use strict";
  var registry = [];
  var REQUIRED = ["id", "name", "description", "stages", "patents", "cardsHTML", "create"];
  global.FIFSuites = {
    register: function (suite) {
      REQUIRED.forEach(function (k) {
        if (suite[k] === undefined || suite[k] === null || suite[k] === "") {
          throw new Error("FIFSuites.register: suite missing required field '" + k + "'");
        }
      });
      if (typeof suite.create !== "function") {
        throw new Error("FIFSuites.register: suite.create must be a function");
      }
      if (this.get(suite.id)) throw new Error("FIFSuites.register: duplicate suite id '" + suite.id + "'");
      registry.push(suite);
    },
    list: function () { return registry.slice(); },
    get: function (id) {
      for (var i = 0; i < registry.length; i++) if (registry[i].id === id) return registry[i];
      return null;
    }
  };
})(window);
