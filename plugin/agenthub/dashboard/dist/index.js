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
  var TAB_BAR = { display: "flex", gap: "2px", borderBottom: "1px solid var(--border, #e2e8f0)", marginBottom: "16px", overflowX: "auto" };
  var TAB_BTN_BASE = { padding: "8px 16px", fontSize: "13px", fontWeight: 500, border: "none", borderBottom: "2px solid transparent", background: "transparent", cursor: "pointer", color: "var(--muted-foreground, #64748b)", whiteSpace: "nowrap", transition: "all 0.15s" };
  var TAB_BTN_ACTIVE = { borderBottomColor: "var(--primary, #3b82f6)", color: "var(--primary, #3b82f6)" };
  var FIELD_STYLE = { marginBottom: "14px" };
  var FIELD_LABEL = { display: "block", fontSize: "13px", fontWeight: 500, marginBottom: "4px", color: "var(--foreground, #0f172a)" };
  var FIELD_DESC = { fontSize: "11px", color: "var(--muted-foreground, #64748b)", marginBottom: "4px" };
  var CHECKBOX_ROW = { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", border: "1px solid var(--border, #e2e8f0)", borderRadius: "6px", marginBottom: "6px", cursor: "pointer", transition: "background 0.1s", fontSize: "13px" };
  var CHECKBOX_ROW_SELECTED = { background: "var(--accent, #f1f5f9)", borderColor: "var(--primary, #3b82f6)" };
  var CARD_SELECTABLE = { cursor: "pointer", transition: "all 0.15s" };
  var HEADER_ROW = { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "8px" };
  var SCHEDULE_INPUT = { width: "100%", padding: "8px 12px", border: "1px solid var(--border, #e2e8f0)", borderRadius: "6px", fontSize: "13px", fontFamily: "monospace" };
  var RESULT_SUCCESS = { marginTop: "12px", padding: "12px", borderRadius: "6px", background: "#e6ffe6", border: "1px solid #b3e6b3" };
  var RESULT_ERROR = { marginTop: "12px", padding: "12px", borderRadius: "6px", background: "#ffe6e6", border: "1px solid #e6b3b3" };
  var PREVIEW_BOX = { background: "#f5f5f5", padding: "12px", borderRadius: "6px", marginTop: "12px", whiteSpace: "pre-wrap", fontSize: "12px", maxHeight: "200px", overflowY: "auto" };
  var EMPTY_STATE = { textAlign: "center", padding: "48px 24px", color: "var(--muted-foreground, #64748b)" };
  var BACK_BTN = { marginBottom: "12px", fontSize: "13px", cursor: "pointer", background: "none", border: "none", color: "var(--primary, #3b82f6)", padding: "0", display: "flex", alignItems: "center", gap: "4px" };
  var SECTION_TITLE = { fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--foreground, #0f172a)" };
  var SUMMARY_ROW = { display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border, #e2e8f0)", fontSize: "13px" };
  var SUMMARY_LABEL = { color: "var(--muted-foreground, #64748b)" };
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
      style: Object.assign({}, CARD_SELECTABLE, opts.selected ? { border: "2px solid var(--primary, #3b82f6)" } : {}),
      onClick: opts.onClick || null
    },
      h(CardHeader, { style: { padding: "12px 16px 4px" } }, h(CardTitle, { style: { fontSize: "14px" } }, tpl.name)),
      h(CardContent, { style: { padding: "4px 16px 12px" } },
        h("p", { style: { fontSize: "12px", color: "var(--muted-foreground, #64748b)", margin: 0, lineHeight: 1.4 } }, tpl.description),
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
      return h(Checkbox, { checked: !!value, onChange: function (e) { onChange(e.target.checked); } });
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
      selectedOption ? h("div", { style: { marginTop: "12px", padding: "10px 12px", background: "var(--muted, #f1f5f9)", borderRadius: "6px", fontSize: "12px" } },
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
      h("div", { style: { marginBottom: "8px", fontSize: "12px", color: "var(--muted-foreground, #64748b)" } },
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
                  h(Checkbox, { checked: isOn, onChange: function () { onToggle(s.name); } }),
                  h("div", null,
                    h("div", { style: { fontWeight: 500, fontSize: "13px" } }, s.name),
                    s.description ? h("div", { style: { fontSize: "11px", color: "var(--muted-foreground, #64748b)" } }, s.description) : null
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
      h("div", { style: { marginBottom: "8px", fontSize: "12px", color: "var(--muted-foreground, #64748b)" } },
        selected.length + " toolset" + (selected.length !== 1 ? "s" : "") + " selected"
      ),
      filtered.length === 0
        ? h("div", { style: EMPTY_STATE }, q ? "No toolsets match your search." : "No toolsets available.")
        : filtered.map(function (t) {
            var isOn = selected.indexOf(t.id) !== -1;
            var rowStyle = Object.assign({}, CHECKBOX_ROW, isOn ? CHECKBOX_ROW_SELECTED : {});
            return h("div", { key: t.id, style: rowStyle, onClick: function () { onToggle(t.id); } },
              h(Checkbox, { checked: isOn, onChange: function () { onToggle(t.id); } }),
              h("div", { style: { flex: 1 } },
                h("div", { style: { fontWeight: 500, fontSize: "13px" } }, t.name),
                t.description ? h("div", { style: { fontSize: "11px", color: "var(--muted-foreground, #64748b)" } }, t.description) : null
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
            h(Checkbox, { checked: isActive, onChange: function () {
              onScheduleChange(preset.value);
              onIsCustomChange(false);
            } }),
            h("span", null, preset.label)
          );
        })
      ),
      h(Separator, { style: { margin: "12px 0" } }),
      h("div", { style: SECTION_TITLE }, "Custom cron expression"),
      h("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
        h(Checkbox, { checked: isCustom, onChange: function (e) { onIsCustomChange(e.target.checked); } }),
        h("span", { style: { fontSize: "13px" } }, "Use custom cron schedule")
      ),
      isCustom ? h("div", null,
        h("input", {
          type: "text", style: SCHEDULE_INPUT,
          value: schedule, placeholder: "0 9 * * *",
          onChange: function (e) { onScheduleChange(e.target.value); },
          "data-testid": "cron-input"
        }),
        h("div", { style: { marginTop: "6px", fontSize: "11px", color: "var(--muted-foreground, #64748b)" } },
          "Format: minute hour day month weekday. Example: ",
          h("code", null, "0 9 * * 1-5"),
          " = weekdays at 9 AM"
        )
      ) : null,
      h("div", { style: { marginTop: "16px", padding: "10px 12px", background: "var(--muted, #f1f5f9)", borderRadius: "6px", fontSize: "12px" } },
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
      h("div", { style: { marginBottom: "12px", fontSize: "12px", color: "var(--muted-foreground, #64748b)" } },
        "Choose where agent output is delivered"
      ),
      all.length === 0
        ? h("div", { style: EMPTY_STATE }, "No channels available.")
        : all.map(function (ch) {
            var isActive = selected === ch.id;
            var rowStyle = Object.assign({}, CHECKBOX_ROW, isActive ? CHECKBOX_ROW_SELECTED : {});
            return h("div", { key: ch.id, style: rowStyle, onClick: function () { onSelect(ch.id); } },
              h(Checkbox, { checked: isActive, onChange: function () { onSelect(ch.id); } }),
              h("div", { style: { flex: 1 } },
                h("div", { style: { fontWeight: 500, fontSize: "13px" } },
                  ch.icon ? h("span", { style: { marginRight: "6px" } }, ch.icon) : null,
                  ch.name
                ),
                ch.description ? h("div", { style: { fontSize: "11px", color: "var(--muted-foreground, #64748b)" } }, ch.description) : null
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
    var s2 = useState(tpl.id), provider = s2[0], setProvider = s2[1];
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
            h("p", { style: { margin: 0, fontSize: "13px", color: "var(--muted-foreground, #64748b)" } }, tpl.description)
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
          h("div", { style: { background: "var(--muted, #f1f5f9)", borderRadius: "8px", padding: "12px" } },
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
      h("div", { style: { marginBottom: "8px", fontSize: "13px", color: "var(--muted-foreground, #64748b)" } },
        props.templates.length + " templates available. Select one to configure."
      ),
      groups.map(function (g) {
        return categorySection(g, function (items) {
          return h("div", { style: GRID }, items.map(function (t) {
            return templateCard(t, {
              onClick: function () { props.onSelect(t); },
              selected: props.selected && props.selected.id === t.id
            });
          }));
        });
      })
    );
  }

  // ── AgentsTab ──────────────────────────────────────────────────────────
  function AgentsTab(props) {
    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (props.jobs == null) return h("p", null, "Loading…");
    var content = (props.jobs.raw || "");
    if (props.jobs.error) content += "\n\nError: " + props.jobs.error;
    return h("div", null,
      h(Button, { variant: "outline", onClick: props.onRefresh, style: { marginBottom: "8px" } }, "Refresh"),
      h("pre", { "data-testid": "agents-list", style: { background: "#f5f5f5", padding: "12px", borderRadius: "6px", whiteSpace: "pre-wrap", fontSize: "12px" } }, content || "No agents yet.")
    );
  }

  // ── Main AgentHub component ────────────────────────────────────────────
  function AgentHub() {
    var t = useState("templates"), tab = t[0], setTab = t[1];
    var tp = useState([]), templates = tp[0], setTemplates = tp[1];
    var te = useState(null), tErr = te[0], setTErr = te[1];
    var jb = useState(null), jobs = jb[0], setJobs = jb[1];
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
    var loadJobs = useCallback(function () {
      setJErr(null);
      fetchJSON("/api/plugins/agenthub/jobs").then(setJobs).catch(function (e) { setJErr(String(e)); });
    }, []);
    useEffect(function () { loadJobs(); }, [loadJobs]);

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
      setSelectedTpl(tpl);
      setAgentName(tpl.name);
      setConfig({});
      setPreview(null);
      setResult(null);
      setWErr(null);
    }

    // Back to gallery
    function backToGallery() {
      setSelectedTpl(null);
      setPreview(null);
      setResult(null);
      setWErr(null);
    }

    // API calls
    function postJSON(path, payload, onOk) {
      setLoading(true); setWErr(null);
      fetchJSON(path, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } })
        .then(onOk).catch(function (e) { setWErr(String(e)); }).finally(function () { setLoading(false); });
    }

    function handlePreview(payload) {
      postJSON("/api/plugins/agenthub/preview", payload, function (d) { setPreview(d.rendered_prompt); });
    }

    function handleCreate(payload) {
      postJSON("/api/plugins/agenthub/create-agent", payload, function (d) {
        setResult(d);
        if (d.job_created && props && props.onCreated) props.onCreated();
        if (d.job_created) loadJobs();
      });
    }

    // Tab navigation
    function tabBtn(value, testid, label) {
      return h(Button, { "data-testid": testid, variant: tab === value ? "default" : "outline",
        onClick: function () { setTab(value); }, style: { marginRight: "8px" } }, label);
    }

    // Determine main content
    var panel;
    if (tab === "agents") {
      panel = h(AgentsTab, { jobs: jobs, error: jErr, onRefresh: loadJobs });
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
    } else if (tab === "create") {
      panel = h(TemplatesTab, { templates: templates, error: tErr, onSelect: selectTemplate, selected: selectedTpl });
    } else {
      panel = h(TemplatesTab, { templates: templates, error: tErr });
    }

    // Header text
    var headerText = tab === "create" && selectedTpl ? "Configure Agent" :
      tab === "create" ? "Choose a Template" :
      tab === "agents" ? "Your Agents" : "Templates";

    return h("div", { "data-testid": "agenthub-root", style: FILL_PANEL },
      h("div", null,
        h("div", { style: HEADER_ROW },
          h("h2", { style: { margin: 0 } }, "AgentHub"),
          h("div", null,
            tabBtn("templates", "tab-templates", "Templates"),
            tabBtn("create", "tab-create", "Create"),
            tabBtn("agents", "tab-agents", "Agents")
          )
        ),
        h(Separator, null)
      ),
      h("div", { style: SCROLL_AREA },
        panel
      )
    );
  }

  // ── Register plugin ────────────────────────────────────────────────────
  window.__HERMES_PLUGINS__.register("agenthub", AgentHub);
})();
