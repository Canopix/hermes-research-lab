(function () {
  "use strict";
  var SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;
  var React = SDK.React;
  var hooks = SDK.hooks;
  var fetchJSON = SDK.fetchJSON;
  var C = SDK.components;
  var useState = hooks.useState, useEffect = hooks.useEffect, useCallback = hooks.useCallback, useMemo = hooks.useMemo, useRef = hooks.useRef;
  var Badge = C.Badge, Button = C.Button, Checkbox = C.Checkbox;
  var Select = C.Select, SelectOption = C.SelectOption;
  var Card = C.Card, CardHeader = C.CardHeader, CardTitle = C.CardTitle, CardContent = C.CardContent;
  var Input = C.Input, Label = C.Label, Separator = C.Separator;
  var h = React.createElement;

  // ── Constants ──────────────────────────────────────────────────────────
  var CATEGORY_ORDER = ["research-intelligence", "development-workflow", "devops-monitoring", "multi-skill-workflows", "other"];
  var CATEGORY_LABELS = {
    "research-intelligence": "Research & Intelligence",
    "development-workflow": "Development Workflow",
    "devops-monitoring": "DevOps & Monitoring",
    "multi-skill-workflows": "Multi-Skill Workflows",
    "other": "Other"
  };
  var SCHEDULE_PRESETS = [
    { label: "Every 30 minutes", value: "*/30 * * * *" },
    { label: "Every hour", value: "0 * * * *" },
    { label: "Every 6 hours", value: "0 */6 * * *" },
    { label: "Every 12 hours", value: "0 */12 * * *" },
    { label: "Daily (9 AM)", value: "0 9 * * *" },
    { label: "Weekly (Mon 9 AM)", value: "0 9 * * 1" },
    { label: "Monthly (1st, 9 AM)", value: "0 9 1 * *" }
  ];

  // ── Styles ─────────────────────────────────────────────────────────────
  var GRID = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" };
  var FILL_PANEL = { position: "relative", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" };
  var SCROLL_AREA = { flex: 1, overflowY: "auto", padding: "0" };
  var TAB_BAR = { display: "flex", gap: "2px", borderBottom: "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)", marginBottom: "16px", overflowX: "auto" };
  var TAB_BTN_BASE = { padding: "8px 16px", fontSize: "13px", fontWeight: 500, border: "none", borderBottom: "2px solid transparent", background: "transparent", cursor: "pointer", color: "var(--color-text-tertiary, #b8942e)", whiteSpace: "nowrap", transition: "all 0.15s" };
  var TAB_BTN_ACTIVE = { borderBottomColor: "var(--midground, #ffac02)", color: "var(--midground, #ffac02)" };
  var FIELD_STYLE = { marginBottom: "14px" };
  var FIELD_LABEL = { display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px", color: "var(--foreground, #fff)" };
  var FIELD_DESC = { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)", marginBottom: "4px" };
  var CHECKBOX_ROW = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)", borderRadius: "6px", marginBottom: "6px", cursor: "pointer", transition: "background 0.1s", fontSize: "13px" };
  var CHECKBOX_ROW_SELECTED = { background: "color-mix(in srgb, var(--midground, #ffac02) 15%, transparent)", borderColor: "var(--midground, #ffac02)" };
  var CARD_SELECTABLE = { cursor: "pointer", transition: "all 0.15s" };
  var HEADER_ROW = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" };
  var SCHEDULE_INPUT = { width: "100%", padding: "8px 12px", border: "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" };
  var RESULT_SUCCESS = { marginTop: "12px", padding: "12px", borderRadius: "6px", background: "color-mix(in srgb, var(--color-success, #4ade80) 15%, transparent)", border: "1px solid var(--color-success, #4ade80)" };
  var RESULT_ERROR = { marginTop: "12px", padding: "12px", borderRadius: "6px", background: "color-mix(in srgb, var(--color-destructive, #fb2c36) 15%, transparent)", border: "1px solid var(--color-destructive, #fb2c36)" };
  var PREVIEW_BOX = { background: "color-mix(in srgb, var(--midground, #ffac02) 10%, transparent)", padding: "12px", borderRadius: "6px", marginTop: "12px", whiteSpace: "pre-wrap", fontSize: "12px", maxHeight: "200px", overflowY: "auto" };
  var EMPTY_STATE = { textAlign: "center", padding: "48px 24px", color: "var(--color-text-tertiary, #b8942e)" };
  var BACK_BTN = { marginBottom: "12px", fontSize: "13px", cursor: "pointer", background: "none", border: "none", color: "var(--midground, #ffac02)", padding: "0", display: "flex", alignItems: "center", gap: "4px" };
  var SECTION_TITLE = { fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--foreground, #fff)" };
  var SUMMARY_ROW = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)", fontSize: "13px" };
  var SUMMARY_LABEL = { color: "var(--color-text-tertiary, #b8942e)" };
  var SUMMARY_VALUE = { fontWeight: 500 };

  // ── Helpers ────────────────────────────────────────────────────────────
  function groupByCategory(templates) {
    var grouped = {};
    templates.forEach(function (t) {
      var cat = t.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(t);
    });
    return CATEGORY_ORDER.filter(function (c) { return grouped[c] && grouped[c].length > 0; })
      .concat(Object.keys(grouped).filter(function (c) { return CATEGORY_ORDER.indexOf(c) === -1; }))
      .map(function (c) { return { key: c, label: CATEGORY_LABELS[c] || c, items: grouped[c] }; });
  }

  function categorySection(group, renderCards) {
    var header = h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "16px", marginBottom: "4px" } },
      h("span", { style: { fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888" } }, group.label),
      h(Badge, { variant: "secondary", style: { fontSize: "10px", padding: "1px 6px" } }, String(group.items.length))
    );
    return h("div", { key: group.key }, header, renderCards(group.items));
  }

  function templateCard(tpl, opts) {
    opts = opts || {};
    var badges = (tpl.tags || []).slice(0, 4).map(function (t) {
      return h(Badge, { key: t, variant: "secondary", style: { fontSize: "10px" } }, t);
    });
    return h(Card, {
      key: tpl.id, "data-testid": "tpl-card",
      style: Object.assign({}, CARD_SELECTABLE, opts.selected ? { border: "2px solid var(--midground, #ffac02)" } : {}),
      onClick: opts.onClick || null
    },
      h(CardHeader, { style: { padding: "12px 16px 4px" } }, h(CardTitle, { style: { fontSize: "14px" } }, tpl.name)),
      h(CardContent, { style: { padding: "4px 16px 12px" } },
        h("p", { style: { fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)", margin: 0, lineHeight: 1.4 } }, tpl.description),
        h("div", { style: { marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" } }, badges)
      )
    );
  }

  function paramField(p, value, onChange) {
    if (p.type === "select") {
      var opts = (p.options || []).map(function (o) { return h(SelectOption, { key: o, value: o }, o); });
      return h(Select, { value: value || "", onChange: function (e) { onChange(e.target.value); } }, opts);
    }
    if (p.type === "toggle") {
      return h(Checkbox, { checked: !!value, onCheckedChange: function (checked) { onChange(checked); } });
    }
    if (p.type === "number") {
      return h(Input, { type: "number", value: (value === undefined || value === null) ? "" : String(value),
        placeholder: p.default || "", onChange: function (e) { onChange(e.target.value === "" ? "" : Number(e.target.value)); } });
    }
    return h(Input, { type: "text", value: value || "", placeholder: p.default || "",
      onChange: function (e) { onChange(e.target.value); } });
  }

  // ── TabButton ──────────────────────────────────────────────────────────
  function TabButton(props) {
    var active = props.active;
    var style = Object.assign({}, TAB_BTN_BASE, active ? TAB_BTN_ACTIVE : {});
    return h("button", { style: style, onClick: props.onClick, "data-testid": props.testid }, props.label);
  }

  // ── ConfigTabPanel (Params) ────────────────────────────────────────────
  function ParamsTabPanel(props) {
    var params = props.template.params || [];
    var config = props.config;
    var change = props.onChange;

    if (!params.length) {
      return h("div", { style: EMPTY_STATE }, "This template has no configurable parameters.");
    }

    return h("div", null,
      params.map(function (p) {
        return h("div", { key: p.name, style: FIELD_STYLE },
          h("label", { style: FIELD_LABEL }, p.label || p.description || p.name),
          p.description ? h("div", { style: FIELD_DESC }, p.description) : null,
          h("div", { style: { marginTop: "2px" } },
            paramField(p, config[p.name], function (v) { change(p.name, v); })
          )
        );
      })
    );
  }

  // ── ConfigTabPanel (Model) ─────────────────────────────────────────────
  function ModelTabPanel(props) {
    var providers = props.providers;
    var provider = props.provider;
    var model = props.model;
    var onProviderChange = props.onProviderChange;
    var onModelChange = props.onModelChange;

    if (providers.loading) {
      return h("div", { style: { padding: "24px", textAlign: "center" } }, "Loading providers…");
    }
    if (providers.error) {
      return h("div", { style: { color: "red", padding: "12px" } }, "Error loading providers: " + providers.error);
    }

    var options = providers.options || [];
    var defaultProvider = providers.default_provider || "";
    var defaultModel = providers.default_model || "";

    var providerOpts = options.map(function (p) {
      return h(SelectOption, { key: p.id, value: p.id }, p.name + (p.is_default ? " (default)" : ""));
    });

    var selectedOption = options.find(function (o) { return o.id === provider; }) || options[0];
    var models = selectedOption && selectedOption.models ? selectedOption.models : [];
    var modelOpts = models.length > 0
      ? models.map(function (m) { return h(SelectOption, { key: m, value: m }, m); })
      : [h(SelectOption, { key: "_default", value: "" }, selectedOption ? selectedOption.model : defaultModel)];

    return h("div", null,
      h("div", { style: FIELD_STYLE },
        h("label", { style: FIELD_LABEL }, "Provider"),
        h("div", { style: FIELD_DESC }, "Select the AI provider for this agent"),
        h(Select, { value: provider || defaultProvider, onChange: function (e) {
          onProviderChange(e.target.value);
          var opt = options.find(function (o) { return o.id === e.target.value; });
          if (opt && !models.length && opt.model) onModelChange(opt.model);
        } }, providerOpts)
      ),
      h("div", { style: FIELD_STYLE },
        h("label", { style: FIELD_LABEL }, "Model"),
        h("div", { style: FIELD_DESC }, "Choose the specific model to use"),
        models.length > 0
          ? h(Select, { value: model || "", onChange: function (e) { onModelChange(e.target.value); } }, modelOpts)
          : h(Input, { type: "text", value: model || defaultModel, placeholder: defaultModel,
              onChange: function (e) { onModelChange(e.target.value); } })
      ),
      selectedOption ? h("div", { style: { marginTop: "12px", padding: "10px 12px", background: "color-mix(in srgb, var(--midground, #ffac02) 10%, transparent)", borderRadius: "6px", fontSize: "12px" } },
        h("strong", null, "Endpoint: "),
        h("span", { style: { fontFamily: "monospace" } }, selectedOption.base_url || "default")
      ) : null
    );
  }

  // ── ConfigTabPanel (Skills) ────────────────────────────────────────────
  function SkillsTabPanel(props) {
    var skills = props.skills;
    var selected = props.selected;   // array of skill names
    var onToggle = props.onToggle;
    var search = props.search;
    var onSearch = props.onSearch;

    if (skills.loading) return h("div", { style: { padding: "24px", textAlign: "center" } }, "Loading skills…");
    if (skills.error) return h("div", { style: { color: "red", padding: "12px" } }, "Error: " + skills.error);

    var all = skills.items || [];
    var q = (search || "").toLowerCase();
    var filtered = q ? all.filter(function (s) {
      return s.name.toLowerCase().indexOf(q) !== -1 ||
        (s.description || "").toLowerCase().indexOf(q) !== -1 ||
        (s.category || "").toLowerCase().indexOf(q) !== -1;
    }) : all;

    // Group by category
    var grouped = {};
    filtered.forEach(function (s) {
      var cat = s.category || "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(s);
    });
    var groups = CATEGORY_ORDER.filter(function (c) { return grouped[c]; })
      .concat(Object.keys(grouped).filter(function (c) { return CATEGORY_ORDER.indexOf(c) === -1; }))
      .map(function (c) { return { key: c, label: CATEGORY_LABELS[c] || c, items: grouped[c] }; });

    return h("div", null,
      h("div", { style: { marginBottom: "12px" } },
        h(Input, { type: "text", value: search || "", placeholder: "Search skills…",
          onChange: function (e) { onSearch(e.target.value); } })
      ),
      h("div", { style: { marginBottom: "8px", fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)" } },
        selected.length + " skill" + (selected.length !== 1 ? "s" : "") + " selected"
      ),
      groups.length === 0
        ? h("div", { style: EMPTY_STATE }, q ? "No skills match your search." : "No skills available.")
        : groups.map(function (g) {
            return h("div", { key: g.key },
              h("div", { style: { fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#888", marginTop: "12px", marginBottom: "6px" } }, g.label),
              g.items.map(function (s) {
                var isOn = selected.indexOf(s.name) !== -1;
                var rowStyle = Object.assign({}, CHECKBOX_ROW, isOn ? CHECKBOX_ROW_SELECTED : {});
                return h("div", { key: s.name, style: rowStyle, onClick: function () { onToggle(s.name); } },
                  h(Checkbox, { checked: isOn }),
                  h("div", null,
                    h("div", { style: { fontWeight: 500, fontSize: "13px" } }, s.name),
                    s.description ? h("div", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)" } }, s.description) : null
                  )
                );
              })
            );
          })
    );
  }

  // ── ConfigTabPanel (Toolsets) ──────────────────────────────────────────
  function ToolsetsTabPanel(props) {
    var toolsets = props.toolsets;
    var selected = props.selected;   // array of toolset ids
    var onToggle = props.onToggle;
    var search = props.search;
    var onSearch = props.onSearch;

    if (toolsets.loading) return h("div", { style: { padding: "24px", textAlign: "center" } }, "Loading toolsets…");
    if (toolsets.error) return h("div", { style: { color: "red", padding: "12px" } }, "Error: " + toolsets.error);

    var all = toolsets.items || [];
    var q = (search || "").toLowerCase();
    var filtered = q ? all.filter(function (t) {
      return t.name.toLowerCase().indexOf(q) !== -1 ||
        (t.description || "").toLowerCase().indexOf(q) !== -1;
    }) : all;

    return h("div", null,
      h("div", { style: { marginBottom: "12px" } },
        h(Input, { type: "text", value: search || "", placeholder: "Search toolsets…",
          onChange: function (e) { onSearch(e.target.value); } })
      ),
      h("div", { style: { marginBottom: "8px", fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)" } },
        selected.length + " toolset" + (selected.length !== 1 ? "s" : "") + " selected"
      ),
      filtered.length === 0
        ? h("div", { style: EMPTY_STATE }, q ? "No toolsets match your search." : "No toolsets available.")
        : filtered.map(function (t) {
            var isOn = selected.indexOf(t.id) !== -1;
            var rowStyle = Object.assign({}, CHECKBOX_ROW, isOn ? CHECKBOX_ROW_SELECTED : {});
            return h("div", { key: t.id, style: rowStyle, onClick: function () { onToggle(t.id); } },
              h(Checkbox, { checked: isOn }),
              h("div", { style: { flex: 1 } },
                h("div", { style: { fontWeight: 500, fontSize: "13px" } }, t.name),
                t.description ? h("div", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)" } }, t.description) : null
              ),
              t.category ? h(Badge, { variant: "secondary", style: { fontSize: "10px" } }, t.category) : null
            );
          })
    );
  }

  // ── ConfigTabPanel (Schedule) ──────────────────────────────────────────
  function ScheduleTabPanel(props) {
    var schedule = props.schedule;
    var onScheduleChange = props.onScheduleChange;
    var isCustom = props.isCustom;
    var onIsCustomChange = props.onIsCustomChange;

    return h("div", null,
      h("div", { style: SECTION_TITLE }, "Schedule presets"),
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px", marginBottom: "16px" } },
        SCHEDULE_PRESETS.map(function (preset) {
          var isActive = !isCustom && schedule === preset.value;
          var style = Object.assign({}, CHECKBOX_ROW, isActive ? CHECKBOX_ROW_SELECTED : {}, { marginBottom: 0 });
          return h("div", { key: preset.value, style: style, onClick: function () {
            onScheduleChange(preset.value);
            onIsCustomChange(false);
          } },
            h(Checkbox, { checked: isActive }),
            h("span", null, preset.label)
          );
        })
      ),
      h(Separator, { style: { margin: "12px 0" } }),
      h("div", { style: SECTION_TITLE }, "Custom cron expression"),
      h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
        h(Checkbox, { checked: isCustom, onCheckedChange: function (checked) { onIsCustomChange(checked); } }),
        h("span", { style: { fontSize: "13px" } }, "Use custom cron schedule")
      ),
      isCustom ? h("div", null,
        h("input", {
          type: "text", style: SCHEDULE_INPUT,
          value: schedule, placeholder: "0 9 * * *",
          onChange: function (e) { onScheduleChange(e.target.value); },
          "data-testid": "cron-input"
        }),
        h("div", { style: { marginTop: "6px", fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)" } },
          "Format: minute hour day month weekday. Example: ",
          h("code", null, "0 9 * * 1-5"),
          " = weekdays at 9 AM"
        )
      ) : null,
      h("div", { style: { marginTop: "16px", padding: "10px 12px", background: "color-mix(in srgb, var(--midground, #ffac02) 10%, transparent)", borderRadius: "6px", fontSize: "12px" } },
        h("strong", null, "Current schedule: "),
        h("code", { style: { marginLeft: "4px" } }, schedule || "none")
      )
    );
  }

  // ── ConfigTabPanel (Delivery) ──────────────────────────────────────────
  function DeliveryTabPanel(props) {
    var channels = props.channels;
    var selected = props.selected;
    var onSelect = props.onSelect;
    var chatId = props.chatId;
    var onChatIdChange = props.onChatIdChange;
    var threadId = props.threadId;
    var onThreadIdChange = props.onThreadIdChange;

    if (channels.loading) return h("div", { style: { padding: "24px", textAlign: "center" } }, "Loading channels…");
    if (channels.error) return h("div", { style: { color: "red", padding: "12px" } }, "Error: " + channels.error);

    var all = channels.items || [];

    return h("div", null,
      h("div", { style: SECTION_TITLE }, "Delivery channel"),
      h("div", { style: { marginBottom: "12px", fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)" } },
        "Choose where agent output is delivered"
      ),
      all.length === 0
        ? h("div", { style: EMPTY_STATE }, "No channels available.")
        : all.map(function (ch) {
            var isActive = selected === ch.id;
            var rowStyle = Object.assign({}, CHECKBOX_ROW, isActive ? CHECKBOX_ROW_SELECTED : {});
            return h("div", { key: ch.id, style: rowStyle, onClick: function () { onSelect(ch.id); } },
              h(Checkbox, { checked: isActive }),
              h("div", { style: { flex: 1 } },
                h("div", { style: { fontWeight: 500, fontSize: "13px" } },
                  ch.icon ? h("span", { style: { marginRight: "6px" } }, ch.icon) : null,
                  ch.name
                ),
                ch.description ? h("div", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)" } }, ch.description) : null
              )
            );
          }),
      // Show chat_id / thread_id fields for selected channel that supports them
      selected && all.find(function (ch) { return ch.id === selected && ch.supports_chat_id; }) ?
        h("div", { style: { marginTop: "16px" } },
          h("div", { style: SECTION_TITLE }, "Channel options"),
          h("div", { style: FIELD_STYLE },
            h("label", { style: FIELD_LABEL }, "Chat ID"),
            h("div", { style: FIELD_DESC }, "Target chat or channel ID"),
            h(Input, { type: "text", value: chatId || "", placeholder: "e.g. -1001234567890",
              onChange: function (e) { onChatIdChange(e.target.value); } })
          ),
          all.find(function (ch) { return ch.id === selected && ch.supports_thread_id; }) ?
            h("div", { style: FIELD_STYLE },
              h("label", { style: FIELD_LABEL }, "Thread ID"),
              h("div", { style: FIELD_DESC }, "Optional: target a specific message thread"),
              h(Input, { type: "text", value: threadId || "", placeholder: "e.g. 42",
                onChange: function (e) { onThreadIdChange(e.target.value); } })
            ) : null
        ) : null
    );
  }

  // ── ConfigTabs ─────────────────────────────────────────────────────────
  function ConfigTabs(props) {
    var activeTab = props.activeTab;
    var setActiveTab = props.setActiveTab;
    var tabs = [
      { key: "params", label: "Params", testid: "tab-params" },
      { key: "model", label: "Model", testid: "tab-model" },
      { key: "skills", label: "Skills", testid: "tab-skills" },
      { key: "toolsets", label: "Toolsets", testid: "tab-toolsets" },
      { key: "schedule", label: "Schedule", testid: "tab-schedule" },
      { key: "delivery", label: "Delivery", testid: "tab-delivery" }
    ];

    return h("div", null,
      h("div", { style: TAB_BAR },
        tabs.map(function (t) {
          return h(TabButton, {
            key: t.key, active: activeTab === t.key, testid: t.testid,
            label: t.label, onClick: function () { setActiveTab(t.key); }
          });
        })
      ),
      h("div", { style: SCROLL_AREA },
        props.children
      )
    );
  }

  // ── DetailPanel (template wizard) ──────────────────────────────────────
  function DetailPanel(props) {
    var tpl = props.template;
    var config = props.config;
    var setConfig = props.setConfig;
    var agentName = props.agentName;
    var setAgentName = props.setAgentName;
    var providers = props.providers;
    var skills = props.skills;
    var toolsets = props.toolsets;
    var channels = props.channels;
    var onBack = props.onBack;
    var loading = props.loading;
    var error = props.error;
    var result = props.result;
    var preview = props.preview;
    var onPreview = props.onPreview;
    var onCreate = props.onCreate;

    var s1 = useState("params"), configTab = s1[0], setConfigTab = s1[1];
    var s2 = useState(""), provider = s2[0], setProvider = s2[1];
    var s3 = useState(""), model = s3[0], setModel = s3[1];
    var s4 = useState([]), skillsSel = s4[0], setSkillsSel = s4[1];
    var s5 = useState([]), toolsetsSel = s5[0], setToolsetsSel = s5[1];
    var s6 = useState("0 9 * * *"), schedule = s6[0], setSchedule = s6[1];
    var s7 = useState(false), isCustomSchedule = s7[0], setIsCustomSchedule = s7[1];
    var s8 = useState("local"), delivery = s8[0], setDelivery = s8[1];
    var s9 = useState(""), chatId = s9[0], setChatId = s9[1];
    var s10 = useState(""), threadId = s10[0], setThreadId = s10[1];
    var s11 = useState(""), skillSearch = s11[0], setSkillSearch = s11[1];
    var s12 = useState(""), toolsetSearch = s12[0], setToolsetSearch = s12[1];

    function toggleSkill(name) {
      setSkillsSel(function (prev) {
        return prev.indexOf(name) !== -1 ? prev.filter(function (n) { return n !== name; }) : prev.concat([name]);
      });
    }
    function toggleToolset(id) {
      setToolsetsSel(function (prev) {
        return prev.indexOf(id) !== -1 ? prev.filter(function (n) { return n !== id; }) : prev.concat([id]);
      });
    }

    function change(name, val) {
      setConfig(function (prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[name] = val; return n; });
    }

    // Init config defaults from template params
    useEffect(function () {
      var defaults = {};
      (tpl.params || []).forEach(function (p) {
        defaults[p.name] = p.default !== undefined ? p.default : (p.type === "toggle" ? false : "");
      });
      setConfig(defaults);
    }, [tpl.id]);

    // Set default provider
    useEffect(function () {
      if (providers.default_provider) setProvider(providers.default_provider);
      if (providers.default_model) setModel(providers.default_model);
    }, [providers.default_provider, providers.default_model]);

    // Determine what to render in the tab content area
    var tabContent;
    if (configTab === "params") {
      tabContent = h(ParamsTabPanel, { template: tpl, config: config, onChange: change });
    } else if (configTab === "model") {
      tabContent = h(ModelTabPanel, {
        providers: providers, provider: provider, model: model,
        onProviderChange: setProvider, onModelChange: setModel
      });
    } else if (configTab === "skills") {
      tabContent = h(SkillsTabPanel, {
        skills: skills, selected: skillsSel, onToggle: toggleSkill,
        search: skillSearch, onSearch: setSkillSearch
      });
    } else if (configTab === "toolsets") {
      tabContent = h(ToolsetsTabPanel, {
        toolsets: toolsets, selected: toolsetsSel, onToggle: toggleToolset,
        search: toolsetSearch, onSearch: setToolsetSearch
      });
    } else if (configTab === "schedule") {
      tabContent = h(ScheduleTabPanel, {
        schedule: schedule, onScheduleChange: setSchedule,
        isCustom: isCustomSchedule, onIsCustomChange: setIsCustomSchedule
      });
    } else if (configTab === "delivery") {
      tabContent = h(DeliveryTabPanel, {
        channels: channels, selected: delivery, onSelect: setDelivery,
        chatId: chatId, onChatIdChange: setChatId,
        threadId: threadId, onThreadIdChange: setThreadId
      });
    }

    // Build the full payload for create/preview
    function buildPayload() {
      return {
        template_id: tpl.id,
        name: agentName || tpl.name,
        config: config,
        provider: provider,
        model: model,
        skills: skillsSel,
        toolsets: toolsetsSel,
        schedule: schedule,
        delivery: delivery,
        chat_id: chatId || undefined,
        thread_id: threadId || undefined
      };
    }

    // Summary sidebar content
    var selectedProviderObj = (providers.options || []).find(function (o) { return o.id === provider; });
    var summaryItems = [
      { label: "Template", value: tpl.name },
      { label: "Provider", value: selectedProviderObj ? selectedProviderObj.name : provider || "default" },
      { label: "Model", value: model || providers.default_model || "default" },
      { label: "Skills", value: skillsSel.length + " selected" },
      { label: "Toolsets", value: toolsetsSel.length + " selected" },
      { label: "Schedule", value: schedule || "none" },
      { label: "Delivery", value: delivery }
    ];

    return h("div", { style: FILL_PANEL },
      // Back button + header
      h("div", null,
        h("button", { style: BACK_BTN, onClick: onBack, "data-testid": "back-btn" }, "← Back to templates"),
        h("div", { style: HEADER_ROW },
          h("div", null,
            h("h3", { style: { margin: "0 0 4px", fontSize: "18px" } }, tpl.name),
            h("p", { style: { margin: 0, fontSize: "13px", color: "var(--color-text-tertiary, #b8942e)" } }, tpl.description)
          ),
          h("div", { style: { display: "flex", gap: "4px" } },
            (tpl.tags || []).map(function (t) {
              return h(Badge, { key: t, variant: "secondary", style: { fontSize: "10px" } }, t);
            })
          )
        ),
        h(Separator, null)
      ),
      // Agent name input
      h("div", { style: { margin: "12px 0 8px" } },
        h("label", { style: FIELD_LABEL }, "Agent name"),
        h(Input, { "data-testid": "agent-name", type: "text", value: agentName || tpl.name,
          placeholder: tpl.name,
          onChange: function (e) { setAgentName(e.target.value); } })
      ),
      // Main content: tabs on left, summary on right (flex layout)
      h("div", { style: { display: "flex", gap: "20px", flex: 1, minHeight: 0 } },
        // Left: Config tabs
        h("div", { style: { flex: "1 1 60%", minWidth: 0, display: "flex", flexDirection: "column" } },
          h(ConfigTabs, { activeTab: configTab, setActiveTab: setConfigTab },
            tabContent
          )
        ),
        // Right: Summary + actions
        h("div", { style: { flex: "0 0 240px", display: "flex", flexDirection: "column", gap: "12px" } },
          h("div", { style: { background: "color-mix(in srgb, var(--midground, #ffac02) 10%, transparent)", borderRadius: "8px", padding: "12px" } },
            h("div", { style: { fontSize: "13px", fontWeight: 600, marginBottom: "8px" } }, "Summary"),
            summaryItems.map(function (item) {
              return h("div", { key: item.label, style: SUMMARY_ROW },
                h("span", { style: SUMMARY_LABEL }, item.label),
                h("span", { style: SUMMARY_VALUE }, item.value)
              );
            })
          ),
          // Actions
          h("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } },
            h(Button, { variant: "outline", disabled: loading,
              onClick: function () { onPreview(buildPayload()); },
              style: { width: "100%" } }, loading ? "…" : "Preview"),
            h(Button, { "data-testid": "create-btn", disabled: loading,
              onClick: function () { onCreate(buildPayload()); },
              style: { width: "100%" } }, loading ? "…" : "Create agent")
          ),
          error ? h("div", { style: RESULT_ERROR }, "Error: " + error) : null,
          preview ? h("div", null,
            h("div", { style: { fontSize: "12px", fontWeight: 600, marginBottom: "4px" } }, "Prompt preview"),
            h("pre", { "data-testid": "prompt-preview", style: PREVIEW_BOX }, preview)
          ) : null,
          result ? h("div", { "data-testid": "create-result",
            style: result.job_created ? RESULT_SUCCESS : RESULT_ERROR },
            result.job_created ? "✓ Agent created successfully" : "Error: " + (result.error || "unknown")
          ) : null
        )
      )
    );
  }

  // ── TemplatesTab (gallery) ─────────────────────────────────────────────
  function TemplatesTab(props) {
    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (!props.templates.length) return h("p", null, "Loading templates…");
    var groups = groupByCategory(props.templates);
    return h("div", null,
      h("div", { style: { marginBottom: "8px", fontSize: "13px", color: "var(--color-text-tertiary, #b8942e)" } },
        props.templates.length + " templates available. Select one to configure."
      ),
      groups.map(function (g) {
        return categorySection(g, function (items) {
          return h("div", { style: GRID }, items.map(function (t) {
            return templateCard(t, {
              onClick: props.onSelect ? function () { props.onSelect(t); } : null,
              selected: props.selected && props.selected.id === t.id
            });
          }));
        });
      })
    );
  }

  function formatAgentDate(value) {
    if (!value) return "—";
    var d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkdown(content) {
    if (!content) return "";
    var html = escapeHtml(content);
    var c = "color:#e8e8e8;";
    var ch = "color:#ffac02;";
    var cl = "color:#ffac02;text-decoration:underline;";
    html = html.replace(/^### (.+)$/gm, "<h3 style=\"margin:1.25rem 0 0.5rem;font-size:1rem;font-weight:600;" + c + "\">$1</h3>");
    html = html.replace(/^## (.+)$/gm, "<h2 style=\"margin:1.5rem 0 0.75rem;font-size:1.125rem;font-weight:600;" + ch + "border-bottom:1px solid rgba(255,172,2,0.2);padding-bottom:0.25rem;\">$1</h2>");
    html = html.replace(/^# (.+)$/gm, "<h1 style=\"margin:0 0 1rem;font-size:1.5rem;font-weight:700;" + ch + "\">$1</h1>");
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong style=\"color:#fff;\">$1</strong>");
    html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"" + cl + "\">$1</a>");
    html = html.replace(/(https?:\/\/[^\s<]+)/g, "<a href=\"$1\" target=\"_blank\" rel=\"noopener noreferrer\" style=\"" + cl + "\">$1</a>");
    html = html.replace(/^- (.+)$/gm, "<li style=\"margin:0.25rem 0;" + c + "\">$1</li>");
    html = html.replace(/(<li[\s\S]*?<\/li>\n?)+/g, function (block) {
      return "<ul style=\"margin:0.75rem 0;padding-left:1.25rem;list-style:disc;\">" + block + "</ul>";
    });
    html = html.replace(/\n\n+/g, "</p><p style=\"margin:0.75rem 0;line-height:1.7;" + c + "\">");
    html = "<p style=\"margin:0.75rem 0;line-height:1.7;" + c + "\">" + html + "</p>";
    html = html.replace(/<p[^>]*>\s*<\/p>/g, "");
    html = html.replace(/<p[^>]*>(<h[123])/g, "$1");
    html = html.replace(/(<\/h[123]>)<\/p>/g, "$1");
    html = html.replace(/<p[^>]*>(<ul)/g, "$1");
    html = html.replace(/(<\/ul>)<\/p>/g, "$1");
    return html;
  }

  function agentDetailRow(label, value) {
    return h("div", { style: SUMMARY_ROW, key: label },
      h("span", { style: SUMMARY_LABEL }, label),
      h("span", { style: SUMMARY_VALUE }, value || "—")
    );
  }

  function agentProfileCard(agent, onSelect) {
    var badges = [];
    if (agent.template_id) {
      badges.push(h(Badge, { key: "tpl", variant: "secondary", style: { fontSize: "10px" } }, agent.template_id));
    }
    if (agent.execution_count) {
      badges.push(h(Badge, { key: "runs", variant: "outline", style: { fontSize: "10px" } }, agent.execution_count + " reportes"));
    }

    return h(Card, {
      key: agent.profile,
      "data-testid": "agent-profile-card",
      style: Object.assign({}, CARD_SELECTABLE, { marginBottom: 0 }),
      onClick: function () { onSelect(agent.profile); }
    },
      h(CardHeader, { style: { padding: "12px 16px 4px" } },
        h("div", { style: { display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "flex-start" } },
          h(CardTitle, { style: { fontSize: "14px", margin: 0 } }, agent.name || agent.profile),
          h("div", { style: { display: "flex", gap: "4px", flexWrap: "wrap", justifyContent: "flex-end" } }, badges)
        )
      ),
      h(CardContent, { style: { padding: "4px 16px 12px" } },
        agent.description
          ? h("p", { style: { fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)", margin: "0 0 8px", lineHeight: 1.5 } }, agent.description)
          : null,
        agentDetailRow("Creado", formatAgentDate(agent.created_at)),
        agentDetailRow("Cron jobs", String((agent.jobs || []).length)),
        agentDetailRow("Última ejecución", formatAgentDate(agent.last_execution_at)),
        h("p", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)", margin: "8px 0 0", fontFamily: "monospace" } }, agent.profile)
      )
    );
  }

  function reportListItem(report, selected, onSelect) {
    return h("button", {
      key: report.id,
      type: "button",
      onClick: function () { onSelect(report); },
      style: {
        width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: "6px",
        borderRadius: "8px", border: selected ? "1px solid var(--midground, #ffac02)" : "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)",
        background: selected ? "color-mix(in srgb, var(--midground, #ffac02) 15%, transparent)" : "var(--background, #170d02)",
        cursor: "pointer", color: "var(--foreground, #fff)"
      }
    },
      h("div", { style: { fontSize: "13px", fontWeight: 600, marginBottom: "4px", lineHeight: 1.35, color: "var(--foreground, #fff)" } }, report.title || "Reporte"),
      h("p", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)", margin: "0 0 6px", lineHeight: 1.45 } }, report.excerpt || ""),
      h("div", { style: { fontSize: "10px", color: "var(--color-text-tertiary, #b8942e)", fontFamily: "monospace" } },
        formatAgentDate(report.started_at),
        report.link_count ? " · " + report.link_count + " fuentes" : ""
      )
    );
  }

  function reportReader(report, agentName) {
    if (!report) {
      return h("div", { style: Object.assign({}, EMPTY_STATE, { padding: "32px 16px" }) },
        h("p", { style: { margin: 0 } }, "Selecciona un reporte para leerlo.")
      );
    }
    if (report.is_silent) {
      return h("div", { style: Object.assign({}, EMPTY_STATE, { padding: "32px 16px" }) },
        h("h3", { style: { margin: "0 0 8px", fontSize: "16px" } }, "Corrida silenciosa"),
        h("p", { style: { margin: 0, fontSize: "13px" } }, agentName + " no encontró novedades en esta ejecución."),
        h("p", { style: { margin: "12px 0 0", fontSize: "11px", fontFamily: "monospace", color: "var(--color-text-tertiary, #b8942e)" } }, formatAgentDate(report.started_at))
      );
    }
    return h("div", { style: { padding: "0 4px 24px", overflowY: "auto", maxHeight: "100%" } },
      h("p", { style: { fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--midground, #ffac02)", margin: "0 0 8px" } }, "Informe de investigación"),
      h("h2", { style: { margin: "0 0 12px", fontSize: "22px", lineHeight: 1.25, fontWeight: 700, color: "var(--foreground, #fff)" } }, report.title || "Reporte"),
      h("div", { style: { display: "flex", flexWrap: "wrap", gap: "12px", fontSize: "12px", color: "var(--color-text-tertiary, #b8942e)", marginBottom: "16px" } },
        h("span", null, agentName),
        h("span", null, formatAgentDate(report.started_at)),
        report.link_count ? h("span", { style: { color: "var(--midground, #ffac02)" } }, report.link_count + " fuentes") : null
      ),
      h("div", {
        style: { fontSize: "14px", color: "#e8e8e8", maxWidth: "65ch" },
        dangerouslySetInnerHTML: { __html: renderMarkdown(report.output || report.excerpt || "") }
      })
    );
  }

  // ── Agent Detail: Stats row ──────────────────────────────────────────
  function agentStat(label, value, color) {
    return h("div", { style: { textAlign: "center", padding: "12px 16px", background: "color-mix(in srgb, var(--midground, #ffac02) 10%, transparent)", borderRadius: "8px", minWidth: "100px" } },
      h("div", { style: { fontSize: "22px", fontWeight: 700, color: color || "var(--foreground, #fff)", lineHeight: 1.2 } }, value),
      h("div", { style: { fontSize: "11px", color: "var(--color-text-tertiary, #b8942e)", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.04em" } }, label)
    );
  }

  // ── Agent Detail: Overview Tab ──────────────────────────────────────
  function AgentOverviewTab(agent) {
    var jobCount = (agent.jobs || []).length;
    var execCount = agent.execution_count || 0;
    var jobs = agent.jobs || [];
    var nextJob = jobs.find(function (j) { return j.next_run; });

    return h("div", { style: { display: "flex", flexDirection: "column", gap: "20px" } },
      // Stats bar
      h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
        agentStat("Cron jobs", String(jobCount)),
        agentStat("Reportes", String(execCount)),
        agentStat("Delivery", agent.jobs[0] ? agent.jobs[0].deliver : "—", "var(--midground, #ffac02)"),
        nextJob
          ? agentStat("Próxima", new Date(nextJob.next_run).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }), "var(--color-success, #4ade80)")
          : null
      ),
      // Info card
      h(Card, { style: { margin: 0 } },
        h(CardHeader, { style: { padding: "12px 16px 4px" } },
          h(CardTitle, { style: { fontSize: "14px" } }, "Información del agente")
        ),
        h(CardContent, { style: { padding: "4px 16px 12px" } },
          h("div", { style: { display: "grid", gridTemplateColumns: "140px 1fr", gap: "6px 12px", fontSize: "13px" } },
            h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Profile"),
            h("span", { style: { fontFamily: "monospace", fontSize: "12px", wordBreak: "break-all" } }, agent.profile),
            h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Template"),
            h("span", null, agent.template_name || agent.template_id || "—"),
            h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Creado"),
            h("span", null, formatAgentDate(agent.created_at)),
            h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Última ejecución"),
            h("span", null, formatAgentDate(agent.last_execution_at))
          )
        )
      ),
      // Description
      agent.description ? h(Card, { style: { margin: 0 } },
        h(CardHeader, { style: { padding: "12px 16px 4px" } },
          h(CardTitle, { style: { fontSize: "14px" } }, "Descripción")
        ),
        h(CardContent, { style: { padding: "4px 16px 12px" } },
          h("p", { style: { fontSize: "13px", lineHeight: 1.6, margin: 0, color: "var(--color-text-tertiary, #b8942e)" } }, agent.description)
        )
      ) : null
    );
  }

  // ── Agent Detail: Cron Jobs Tab ─────────────────────────────────────
  function AgentCronJobsTab(props) {
    var agent = props.agent || props;
    var onRunJob = props.onRunJob;
    var runningJobId = props.runningJobId;
    var runMessage = props.runMessage;
    var jobs = agent.jobs || [];
    if (!jobs.length) {
      return h("div", { style: EMPTY_STATE },
        h("p", { style: { margin: 0 } }, "Este agente no tiene cron jobs todavía."),
        h("p", { style: { margin: "8px 0 0", fontSize: "12px" } }, "Crea el agente desde Templates para vincular un schedule.")
      );
    }

    function jobStatusBadge(status) {
      var s = String(status || "").toLowerCase();
      var color = s === "active" || s === "scheduled" ? "var(--color-success, #4ade80)" : s === "paused" ? "var(--color-warning, #d97706)" : "var(--color-destructive, #fb2c36)";
      return h(Badge, { variant: "outline", style: { fontSize: "10px", borderColor: color, color: color } }, status || "unknown");
    }

    function runMessageBanner() {
      if (!runMessage) return null;
      var bg = runMessage.type === "success" ? "var(--color-success, #4ade80)" : runMessage.type === "error" ? "var(--color-destructive, #fb2c36)" : "var(--midground, #ffac02)";
      return h("div", { style: { padding: "10px 14px", borderRadius: "8px", background: bg, color: "#fff", fontSize: "13px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px" } },
        runMessage.type === "info" ? h("div", { style: { width: "16px", height: "16px", border: "2px solid #fff", borderTopColor: "transparent", borderRadius: "50%", animation: "agenthub-spin 0.8s linear infinite" } }) : null,
        runMessage.type === "success" ? h("span", null, "✓") : null,
        runMessage.type === "error" ? h("span", null, "✕") : null,
        h("span", null, runMessage.text)
      );
    }

    return h("div", { style: { display: "flex", flexDirection: "column", gap: "12px" } },
      // Run status banner (inline)
      runMessageBanner(),
      // Running spinner banner
      runningJobId ? h("div", { style: { padding: "10px 14px", borderRadius: "8px", background: "color-mix(in srgb, var(--midground, #ffac02) 15%, transparent)", border: "1px solid var(--midground, #ffac02)", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" } },
        h("div", { style: { width: "16px", height: "16px", border: "2px solid var(--midground, #ffac02)", borderTopColor: "transparent", borderRadius: "50%", animation: "agenthub-spin 0.8s linear infinite" } }),
        h("span", { style: { fontWeight: 500 } }, "Ejecutando job", runningJobId ? "…" : ""),
        h("span", { style: { fontSize: "11px", fontFamily: "monospace", color: "var(--color-text-tertiary, #b8942e)" } }, runningJobId)
      ) : null,
      jobs.map(function (job) {
        var isRunning = runningJobId === job.id;
        return h(Card, { key: job.id, style: { margin: 0, opacity: isRunning ? 0.7 : 1, transition: "opacity 0.2s" } },
          h(CardContent, { style: { padding: "14px 16px" } },
            h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" } },
              h("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
                h("span", { style: { fontWeight: 600, fontSize: "14px" } }, job.name || "Cron Job"),
                jobStatusBadge(job.status),
                isRunning ? h("span", { style: { fontSize: "11px", color: "var(--midground, #ffac02)", fontWeight: 500 } }, "corriendo…") : null
              ),
              h(Button, {
                variant: isRunning ? "default" : "outline",
                size: "sm",
                onClick: function () { onRunJob(job.id); },
                disabled: runningJobId != null,
                "data-testid": "run-job-" + job.id,
                style: Object.assign({ fontSize: "12px", minWidth: "110px" }, isRunning ? { background: "var(--midground, #ffac02)", color: "#fff" } : {})
              }, isRunning ? "⏳ Ejecutando…" : "▶ Ejecutar ahora")
            ),
            h("div", { style: { display: "grid", gridTemplateColumns: "120px 1fr 120px 1fr", gap: "6px 12px", fontSize: "13px" } },
              h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Schedule"),
              h("span", { style: { fontFamily: "monospace" } }, job.schedule),
              h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Próxima corrida"),
              h("span", null, formatAgentDate(job.next_run)),
              h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Delivery"),
              h("span", null, job.deliver || "local"),
              h("span", { style: { color: "var(--color-text-tertiary, #b8942e)" } }, "Última corrida"),
              h("span", null, job.last_run ? formatAgentDate(job.last_run) : "—")
            )
          )
        );
      })
    );
  }

  // ── Agent Detail: History Tab (blog reader) ─────────────────────────
  function AgentHistoryTab(props) {
    var agent = props.agent || props;
    var selectedReport = props.selectedReport;
    var setSelectedReport = props.setSelectedReport;
    var executions = (agent.executions || []).filter(function (r) { return !r.is_failed; });
    if (!executions.length) {
      return h("div", { style: { minHeight: "300px" } },
        h("div", { style: EMPTY_STATE },
          h("p", { style: { margin: 0 } }, "Aún no hay reportes."),
          h("p", { style: { margin: "8px 0 0", fontSize: "12px" } }, "Ejecuta el cron job o espera la próxima corrida programada.")
        )
      );
    }
    return h("div", { style: { display: "grid", gridTemplateColumns: "minmax(240px, 300px) minmax(0, 1fr)", gap: "0", minHeight: "400px", alignItems: "stretch" } },
      // Feed sidebar
      h("div", { style: { overflowY: "auto", maxHeight: "560px", paddingRight: "12px", borderRight: "1px solid color-mix(in srgb, var(--midground, #ffac02) 20%, transparent)" } },
        executions.map(function (report) {
          return reportListItem(report, selectedReport && selectedReport.id === report.id, setSelectedReport);
        })
      ),
      // Reader
      h("div", { style: { padding: "4px 16px 24px", overflowY: "auto", maxHeight: "560px" } },
        reportReader(selectedReport, agent.name)
      )
    );
  }

  // ── Agent Detail View ───────────────────────────────────────────────
  function AgentDetailView(props) {
    var agent = props.agent;
    var onRunJob = props.onRunJob;
    var runningJobId = props.runningJobId;
    var dtab = useState("overview"), detailTab = dtab[0], setDetailTab = dtab[1];
    var rep = useState(null), selectedReport = rep[0], setSelectedReport = rep[1];

    useEffect(function () {
      setSelectedReport(executions[0] || null);
    }, [agent.profile]);

    var executions = (agent.executions || []).filter(function (r) { return !r.is_failed; });

    // Sub-tab button helper
    function detailTabBtn(key, label, count) {
      var isActive = detailTab === key;
      return h("button", {
        key: key,
        type: "button",
        onClick: function () { setDetailTab(key); },
        style: Object.assign({}, TAB_BTN_BASE, isActive ? TAB_BTN_ACTIVE : {}),
      }, label + (count != null ? " (" + count + ")" : ""));
    }

    var jobCount = (agent.jobs || []).length;
    var reportCount = agent.execution_count || 0;

    return h("div", { style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0 } },
      // Back button
      h("button", { type: "button", onClick: props.onBack, style: BACK_BTN }, "← Volver a agentes"),

      // Agent header card
      h(Card, { style: { margin: "0 0 16px", background: "var(--color-muted, #f8fafc)" } },
        h(CardContent, { style: { padding: "16px 20px" } },
          h("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" } },
            h("div", { style: { flex: 1, minWidth: "200px" } },
              h("div", { style: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px", flexWrap: "wrap" } },
                h("h2", { style: { margin: 0, fontSize: "22px", fontWeight: 700 } }, agent.name),
                agent.template_id ? h(Badge, { variant: "secondary", style: { fontSize: "11px" } }, agent.template_id) : null
              ),
              agent.description ? h("p", { style: { margin: "4px 0 0", fontSize: "13px", color: "var(--color-text-tertiary, #b8942e)", lineHeight: 1.5, maxWidth: "60ch" } }, agent.description) : null
            ),
            // Quick stats
            h("div", { style: { display: "flex", gap: "16px", flexShrink: 0 } },
              h("div", { style: { textAlign: "right" } },
                h("div", { style: { fontSize: "18px", fontWeight: 700 } }, String(jobCount)),
                h("div", { style: { fontSize: "10px", color: "var(--color-text-tertiary, #b8942e)", textTransform: "uppercase" } }, "Jobs")
              ),
              h("div", { style: { textAlign: "right" } },
                h("div", { style: { fontSize: "18px", fontWeight: 700 } }, String(reportCount)),
                h("div", { style: { fontSize: "10px", color: "var(--color-text-tertiary, #b8942e)", textTransform: "uppercase" } }, "Reportes")
              ),
              h("div", { style: { textAlign: "right" } },
                h("div", { style: { fontSize: "18px", fontWeight: 700, color: "var(--midground, #ffac02)" } }, agent.jobs[0] ? agent.jobs[0].deliver : "—"),
                h("div", { style: { fontSize: "10px", color: "var(--color-text-tertiary, #b8942e)", textTransform: "uppercase" } }, "Delivery")
              )
            )
          )
        )
      ),

      // Sub-tabs bar
      h("div", { style: TAB_BAR },
        detailTabBtn("overview", "Overview"),
        detailTabBtn("jobs", "Cron Jobs", jobCount),
        detailTabBtn("history", "Historial", reportCount)
      ),

      // Tab content
      h("div", { style: { flex: 1, overflowY: "auto", minHeight: 0 } },
        detailTab === "overview" ? h(AgentOverviewTab, agent) :
        detailTab === "jobs" ? h(AgentCronJobsTab, { agent: agent, onRunJob: onRunJob, runningJobId: runningJobId, runMessage: props.runMessage }) :
        h(AgentHistoryTab, { agent: agent, selectedReport: selectedReport, setSelectedReport: setSelectedReport })
      )
    );
  }

  // ── AgentsTab ──────────────────────────────────────────────────────────
  function AgentsTab(props) {
    var sel = useState(null), selectedProfile = sel[0], setSelectedProfile = sel[1];
    var det = useState(null), detail = det[0], setDetail = det[1];
    var ld = useState(false), loadingDetail = ld[0], setLoadingDetail = ld[1];
    var de = useState(null), detailErr = de[0], setDetailErr = de[1];
    var rm = useState(null), runningJobId = rm[0], setRunningJobId = rm[1];
    var rm2 = useState(null), runMessage = rm2[0], setRunMessage = rm2[1];

    function handleRunJob(jobId) {
      if (!selectedProfile || runningJobId) return;
      setRunningJobId(jobId);
      setRunMessage({ type: "info", text: "Ejecutando job " + jobId + "…" });
      showToast("Ejecutando job " + jobId + "…", "info");
      console.log("[AgentHub] Running job:", jobId, "profile:", selectedProfile);

      var url = "/api/plugins/agenthub/agents/" + encodeURIComponent(selectedProfile) + "/run/" + encodeURIComponent(jobId);
      console.log("[AgentHub] POST", url);

      fetchJSON(url, {
        method: "POST", headers: { "Content-Type": "application/json" }
      })
        .then(function (result) {
          console.log("[AgentHub] Run result:", result);
          if (result && result.detail) {
            throw new Error(result.detail);
          }
          var msg = "Job ejecutado correctamente";
          if (result && result.gateway_started) {
            msg += " — Gateway iniciado automáticamente";
          }
          setRunMessage({ type: "success", text: msg });
          showToast(msg, "success");
          // Refresh agent detail after run
          return fetchJSON("/api/plugins/agenthub/agents/" + encodeURIComponent(selectedProfile));
        })
        .then(function (d) {
          console.log("[AgentHub] Refreshed agent data:", d);
          setDetail(d);
        })
        .catch(function (e) {
          console.error("[AgentHub] Run error:", e);
          var msg = e && e.message ? e.message : String(e);
          if (msg.includes("Unauthorized")) {
            msg = "No autorizado — verifica la autenticación del dashboard";
          }
          setRunMessage({ type: "error", text: "Error: " + msg });
          showToast("Error: " + msg, "error");
        })
        .finally(function () {
          setRunningJobId(null);
          // Auto-clear inline message after 5s
          setTimeout(function () { setRunMessage(null); }, 5000);
        });
    }

    useEffect(function () {
      if (!selectedProfile) {
        setDetail(null);
        return;
      }
      setLoadingDetail(true);
      setDetailErr(null);
      fetchJSON("/api/plugins/agenthub/agents/" + encodeURIComponent(selectedProfile))
        .then(function (d) { setDetail(d); })
        .catch(function (e) { setDetailErr(String(e)); setDetail(null); })
        .finally(function () { setLoadingDetail(false); });
    }, [selectedProfile]);

    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (props.agentsData == null) return h("p", null, "Loading…");

    if (selectedProfile) {
      if (loadingDetail) return h("p", null, "Cargando agente…");
      if (detailErr) return h("div", null,
        h("button", { type: "button", onClick: function () { setSelectedProfile(null); }, style: BACK_BTN }, "← Volver"),
        h("p", { style: { color: "red" } }, detailErr)
      );
      if (detail) {
        return h(AgentDetailView, {
          agent: detail,
          onBack: function () { setSelectedProfile(null); },
          onRunJob: handleRunJob,
          runningJobId: runningJobId,
          runMessage: runMessage
        });
      }
    }

    var agents = Array.isArray(props.agentsData.agents) ? props.agentsData.agents : [];

    return h("div", null,
      h("div", { style: HEADER_ROW },
        h("p", { style: { margin: 0, fontSize: "13px", color: "var(--color-text-tertiary, #b8942e)" } },
          agents.length ? agents.length + " agente(s) AgentHub" : "No hay agentes AgentHub todavía"
        ),
        h(Button, { variant: "outline", onClick: props.onRefresh, "data-testid": "agents-refresh" }, "Refresh")
      ),
      agents.length === 0
        ? h("div", { style: EMPTY_STATE, "data-testid": "agents-list" },
            h("p", { style: { margin: 0 } }, "No agents yet."),
            h("p", { style: { margin: "8px 0 0", fontSize: "12px" } }, "Create one from the Templates tab.")
          )
        : h("div", { "data-testid": "agents-list", style: GRID },
            agents.map(function (agent) {
              return agentProfileCard(agent, setSelectedProfile);
            })
          )
    );
  }

  // ── Inject styles ─────────────────────────────────────────────────────
  if (!document.getElementById("agenthub-styles")) {
    var style = document.createElement("style");
    style.id = "agenthub-styles";
    style.textContent = [
      "@keyframes agenthub-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }",
      "@keyframes agenthub-toast-in { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }",
      "@keyframes agenthub-toast-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(-20px); opacity: 0; } }",
      ".agenthub-toast { position: fixed; bottom: 24px; right: 24px; z-index: 99999; padding: 14px 22px; border-radius: 10px; font-size: 14px; font-weight: 600; box-shadow: 0 6px 20px rgba(0,0,0,0.25); animation: agenthub-toast-in 0.25s ease-out; pointer-events: auto; max-width: 380px; line-height: 1.4; }",
      ".agenthub-toast.agenthub-toast-success { background: #15803d; color: #fff; border: 2px solid #22c55e; }",
      ".agenthub-toast.agenthub-toast-error { background: #b91c1c; color: #fff; border: 2px solid #ef4444; }",
      ".agenthub-toast.agenthub-toast-info { background: #1d4ed8; color: #fff; border: 2px solid #60a5fa; }",
      ".agenthub-toast.agenthub-toast-leaving { animation: agenthub-toast-out 0.2s ease-in forwards; }"
    ].join("\n");
    document.head.appendChild(style);
  }

  // ── Toast helper ─────────────────────────────────────────────────────
  function showToast(message, type) {
    try {
      type = type || "info";
      var el = document.createElement("div");
      el.className = "agenthub-toast agenthub-toast-" + type;
      el.textContent = message;
      document.body.appendChild(el);
      console.log("[AgentHub Toast]", type.toUpperCase(), message);
      setTimeout(function () {
        el.classList.add("agenthub-toast-leaving");
        setTimeout(function () { el.remove(); }, 250);
      }, 4000);
    } catch (e) {
      console.error("[AgentHub Toast Error]", e);
    }
  }

  // ── Safe fetch wrapper ───────────────────────────────────────────────
  function apiFetch(path, opts) {
    return fetchJSON(path, opts).then(function (data) {
      if (data && data.detail) {
        throw new Error(data.detail);
      }
      return data;
    });
  }

  // ── Main AgentHub component ────────────────────────────────────────────
  function AgentHub() {
    var t = useState("templates"), tab = t[0], setTab = t[1];
    var tp = useState([]), templates = tp[0], setTemplates = tp[1];
    var te = useState(null), tErr = te[0], setTErr = te[1];
    var jb = useState(null), agentsData = jb[0], setAgentsData = jb[1];
    var je = useState(null), jErr = je[0], setJErr = je[1];

    // Wizard state
    var w1 = useState(null), selectedTpl = w1[0], setSelectedTpl = w1[1];
    var w2 = useState(""), agentName = w2[0], setAgentName = w2[1];
    var w3 = useState({}), config = w3[0], setConfig = w3[1];
    var w4 = useState(false), loading = w4[0], setLoading = w4[1];
    var w5 = useState(null), wErr = w5[0], setWErr = w5[1];
    var w6 = useState(null), preview = w6[0], setPreview = w6[1];
    var w7 = useState(null), result = w7[0], setResult = w7[1];

    // Data fetched once at top level
    var prov = useState({ loading: true, options: [], default_provider: "", default_model: "" }), providers = prov[0], setProviders = prov[1];
    var sk = useState({ loading: true, items: [] }), skills = sk[0], setSkills = sk[1];
    var ts = useState({ loading: true, items: [] }), toolsets = ts[0], setToolsets = ts[1];
    var ch = useState({ loading: true, items: [] }), channels = ch[0], setChannels = ch[1];

    // Load templates
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/templates")
        .then(function (d) { setTemplates(Array.isArray(d) ? d : []); })
        .catch(function (e) { setTErr(String(e)); });
    }, []);

    // Load jobs
    var loadAgents = useCallback(function () {
      setJErr(null);
      fetchJSON("/api/plugins/agenthub/agents").then(setAgentsData).catch(function (e) { setJErr(String(e)); });
    }, []);
    useEffect(function () { loadAgents(); }, [loadAgents]);

    // Load providers
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/providers")
        .then(function (d) { setProviders({ loading: false, options: d.options || [], default_provider: d.default_provider || "", default_model: d.default_model || "" }); })
        .catch(function (e) { setProviders({ loading: false, options: [], default_provider: "", default_model: "", error: String(e) }); });
    }, []);

    // Load skills
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/skills")
        .then(function (d) { setSkills({ loading: false, items: Array.isArray(d) ? d : [] }); })
        .catch(function (e) { setSkills({ loading: false, items: [], error: String(e) }); });
    }, []);

    // Load toolsets
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/toolsets")
        .then(function (d) { setToolsets({ loading: false, items: Array.isArray(d) ? d : [] }); })
        .catch(function (e) { setToolsets({ loading: false, items: [], error: String(e) }); });
    }, []);

    // Load channels
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/channels")
        .then(function (d) { setChannels({ loading: false, items: Array.isArray(d) ? d : [] }); })
        .catch(function (e) { setChannels({ loading: false, items: [], error: String(e) }); });
    }, []);

    // Select template for wizard
    function selectTemplate(tpl) {
      setTab("create");
      setSelectedTpl(tpl);
      setAgentName(tpl.name);
      setConfig({});
      setPreview(null);
      setResult(null);
      setWErr(null);
    }

    // Back to gallery
    function backToGallery() {
      setTab("templates");
      setSelectedTpl(null);
      setPreview(null);
      setResult(null);
      setWErr(null);
    }

    // API calls
    function postJSON(path, payload, onOk) {
      setLoading(true); setWErr(null);
      apiFetch(path, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } })
        .then(onOk)
        .catch(function (e) { setWErr(String(e)); showToast("Error: " + String(e), "error"); })
        .finally(function () { setLoading(false); });
    }

    function handlePreview(payload) {
      postJSON("/api/plugins/agenthub/preview", payload, function (d) { setPreview(d.rendered_prompt); });
    }

    function handleCreate(payload) {
      postJSON("/api/plugins/agenthub/create-agent", payload, function (d) {
        setResult(d);
        if (d.job_created) {
          loadAgents();
          showToast("Agente creado correctamente", "success");
        }
      });
    }

    // Tab navigation
    function tabBtn(value, testid, label, icon) {
      var isActive = tab === value;
      return h("button", {
        key: value,
        "data-testid": testid,
        type: "button",
        onClick: function () { setTab(value); },
        style: Object.assign({}, TAB_BTN_BASE, isActive ? TAB_BTN_ACTIVE : {})
      }, icon ? icon + " " + label : label);
    }

    // Determine main content
    var panel;
    if (tab === "agents") {
      panel = h(AgentsTab, { agentsData: agentsData, error: jErr, onRefresh: loadAgents });
    } else if (tab === "create" && selectedTpl) {
      // Detail panel view — no scroll on the outer container
      panel = h(DetailPanel, {
        template: selectedTpl,
        config: config, setConfig: setConfig,
        agentName: agentName, setAgentName: setAgentName,
        providers: providers,
        skills: skills,
        toolsets: toolsets,
        channels: channels,
        onBack: backToGallery,
        loading: loading, error: wErr, result: result, preview: preview,
        onPreview: handlePreview, onCreate: handleCreate
      });
    } else {
      panel = h(TemplatesTab, { templates: templates, error: tErr, onSelect: selectTemplate, selected: selectedTpl });
    }

    var showTabs = tab !== "create" || !selectedTpl;

    return h("div", { "data-testid": "agenthub-root", style: FILL_PANEL },
      // Header
      h("div", { style: { padding: "12px 16px 0" } },
        h("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" } },
          h("h2", { style: { margin: 0, fontSize: "18px", fontWeight: 700 } }, "AgentHub"),
          showTabs ? h(Button, {
            variant: "default",
            size: "sm",
            "data-testid": "btn-create-agent",
            onClick: function () { setTab("templates"); setSelectedTpl(null); },
            style: { fontSize: "12px" }
          }, "+ New Agent") : null
        ),
        // Tab bar (hidden during wizard)
        showTabs ? h("div", { style: TAB_BAR },
          tabBtn("templates", "tab-templates", "Templates"),
          tabBtn("agents", "tab-agents", "Agents")
        ) : h("div", { style: TAB_BAR },
          h("button", {
            type: "button",
            onClick: backToGallery,
            style: Object.assign({}, TAB_BTN_BASE, TAB_BTN_ACTIVE)
          }, "← Templates")
        )
      ),
      // Content
      h("div", { style: SCROLL_AREA },
        panel
      )
    );
  }

  // ── Register plugin ────────────────────────────────────────────────────
  window.__HERMES_PLUGINS__.register("agenthub", AgentHub);
})();
