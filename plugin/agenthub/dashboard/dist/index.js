(function () {
  "use strict";
  var SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;
  var React = SDK.React;
  var hooks = SDK.hooks;
  var fetchJSON = SDK.fetchJSON;
  var C = SDK.components;
  var useState = hooks.useState, useEffect = hooks.useEffect, useCallback = hooks.useCallback;
  var Badge = C.Badge, Button = C.Button, Checkbox = C.Checkbox;
  var Select = C.Select, SelectOption = C.SelectOption;
  var Card = C.Card, CardHeader = C.CardHeader, CardTitle = C.CardTitle, CardContent = C.CardContent;
  var Input = C.Input, Label = C.Label, Separator = C.Separator;
  var h = React.createElement;

  var GRID = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" };

  var CATEGORY_ORDER = ["research-intelligence", "development-workflow", "devops-monitoring", "multi-skill-workflows", "other"];
  var CATEGORY_LABELS = {
    "research-intelligence": "Research & Intelligence",
    "development-workflow": "Development Workflow",
    "devops-monitoring": "DevOps & Monitoring",
    "multi-skill-workflows": "Multi-Skill Workflows",
    "other": "Other"
  };

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
    return h("div", { key: group.key },
      header,
      renderCards(group.items)
    );
  }

  function templateCard(tpl, opts) {
    opts = opts || {};
    var badges = (tpl.tags || []).map(function (t) { return h(Badge, { key: t, variant: "secondary" }, t); });
    return h(Card, {
      key: tpl.id, "data-testid": "tpl-card",
      style: opts.onClick ? { cursor: "pointer", border: opts.selected ? "2px solid #0066cc" : "" } : null,
      onClick: opts.onClick || null
    },
      h(CardHeader, null, h(CardTitle, null, tpl.name)),
      h(CardContent, null,
        h("p", null, tpl.description),
        h("div", { style: { marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" } }, badges)
      )
    );
  }

  function TemplatesTab(props) {
    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (!props.templates.length) return h("p", null, "Loading templates…");
    var groups = groupByCategory(props.templates);
    return h("div", null,
      groups.map(function (g) {
        return categorySection(g, function (items) {
          return h("div", { style: GRID }, items.map(function (t) { return templateCard(t); }));
        });
      })
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
      return h(Input, { type: "number", value: (value === undefined || value === null) ? "" : value,
        placeholder: p.default || "", onChange: function (e) { onChange(e.target.value === "" ? "" : Number(e.target.value)); } });
    }
    return h(Input, { type: "text", value: value || "", placeholder: p.default || "",
      onChange: function (e) { onChange(e.target.value); } });
  }

  function CreateTab(props) {
    var s1 = useState(null), selected = s1[0], setSelected = s1[1];
    var s2 = useState(""), agentName = s2[0], setAgentName = s2[1];
    var s3 = useState({}), config = s3[0], setConfig = s3[1];
    var s4 = useState(null), preview = s4[0], setPreview = s4[1];
    var s5 = useState(null), result = s5[0], setResult = s5[1];
    var s6 = useState(false), loading = s6[0], setLoading = s6[1];
    var s7 = useState(null), error = s7[0], setError = s7[1];

    var select = useCallback(function (tpl) {
      setSelected(tpl); setAgentName(tpl.name); setPreview(null); setResult(null);
      var d = {};
      (tpl.params || []).forEach(function (p) {
        d[p.name] = p.default !== undefined ? p.default : (p.type === "toggle" ? false : "");
      });
      setConfig(d);
    }, []);

    var change = useCallback(function (name, val) {
      setConfig(function (prev) { var n = {}; for (var k in prev) n[k] = prev[k]; n[name] = val; return n; });
    }, []);

    function post(path, payload, onOk) {
      setLoading(true); setError(null);
      fetchJSON(path, { method: "POST", body: JSON.stringify(payload), headers: { "Content-Type": "application/json" } })
        .then(onOk).catch(function (e) { setError(String(e)); }).finally(function () { setLoading(false); });
    }

    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (!props.templates.length) return h("p", null, "Loading templates…");
    var groups = groupByCategory(props.templates);
    var gallery = h("div", null,
      groups.map(function (g) {
        return categorySection(g, function (items) {
          return h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" } },
            items.map(function (t) {
              return templateCard(t, { onClick: function () { select(t); }, selected: selected && selected.id === t.id });
            })
          );
        });
      })
    );

    var form = null;
    if (selected) {
      var fields = (selected.params || []).map(function (p) {
        return h("div", { key: p.name, style: { marginBottom: "12px" } },
          h(Label, null, p.description || p.name),
          h("div", { style: { marginTop: "4px" } }, paramField(p, config[p.name], function (v) { change(p.name, v); }))
        );
      });
      form = h("div", { "data-testid": "wizard-form", style: { marginTop: "24px", maxWidth: "520px" } },
        h("div", { style: { marginBottom: "16px" } },
          h(Label, null, "Nombre del agente"),
          h(Input, { "data-testid": "agent-name", type: "text", value: agentName, placeholder: selected.name,
            onChange: function (e) { setAgentName(e.target.value); } })
        ),
        fields,
        h("div", { style: { display: "flex", gap: "8px", marginTop: "16px" } },
          h(Button, { variant: "outline", disabled: loading,
            onClick: function () { post("/api/plugins/agenthub/preview", { template_id: selected.id, config: config }, function (d) { setPreview(d.rendered_prompt); }); } },
            loading ? "…" : "Preview"),
          h(Button, { "data-testid": "create-btn", disabled: loading,
            onClick: function () { post("/api/plugins/agenthub/create-agent", { template_id: selected.id, name: agentName, config: config }, function (d) { setResult(d); if (d.job_created && props.onCreated) props.onCreated(); }); } },
            loading ? "…" : "Create agent")
        ),
        error ? h("p", { style: { color: "red", marginTop: "8px" } }, "Error: " + error) : null,
        preview ? h("pre", { "data-testid": "prompt-preview", style: { background: "#f5f5f5", padding: "12px", borderRadius: "4px", marginTop: "16px", whiteSpace: "pre-wrap", fontSize: "13px" } }, preview) : null,
        result ? h("div", { "data-testid": "create-result", style: { marginTop: "12px", padding: "8px", borderRadius: "4px", background: result.job_created ? "#e6ffe6" : "#ffe6e6" } },
          result.job_created ? "✓ Agente creado" : "Error: " + (result.error || "desconocido")) : null
      );
    }

    return h("div", null, gallery, form);
  }

  function AgentsTab(props) {
    if (props.error) return h("p", { style: { color: "red" } }, "Error: " + props.error);
    if (props.jobs == null) return h("p", null, "Loading…");
    var content = (props.jobs.raw || "");
    if (props.jobs.error) content += "\n\nError: " + props.jobs.error;
    return h("div", null,
      h(Button, { variant: "outline", onClick: props.onRefresh, style: { marginBottom: "8px" } }, "Refresh"),
      h("pre", { "data-testid": "agents-list", style: { background: "#f5f5f5", padding: "12px", borderRadius: "4px", whiteSpace: "pre-wrap", fontSize: "13px" } }, content || "No agents yet.")
    );
  }

  function AgentHub() {
    var t = useState("templates"), tab = t[0], setTab = t[1];
    var tp = useState([]), templates = tp[0], setTemplates = tp[1];
    var te = useState(null), tErr = te[0], setTErr = te[1];
    var jb = useState(null), jobs = jb[0], setJobs = jb[1];
    var je = useState(null), jErr = je[0], setJErr = je[1];

    // All data fetching lives here (AgentHub is always mounted), so the
    // per-tab components are pure and receive data via props.
    useEffect(function () {
      fetchJSON("/api/plugins/agenthub/templates")
        .then(function (d) { setTemplates(Array.isArray(d) ? d : []); })
        .catch(function (e) { setTErr(String(e)); });
    }, []);

    var loadJobs = useCallback(function () {
      setJErr(null);
      fetchJSON("/api/plugins/agenthub/jobs").then(setJobs).catch(function (e) { setJErr(String(e)); });
    }, []);
    useEffect(function () { loadJobs(); }, [loadJobs]);

    function tabBtn(value, testid, label) {
      return h(Button, { "data-testid": testid, variant: tab === value ? "default" : "outline",
        onClick: function () { setTab(value); }, style: { marginRight: "8px" } }, label);
    }

    var panel;
    if (tab === "create") panel = h(CreateTab, { templates: templates, error: tErr, onCreated: loadJobs });
    else if (tab === "agents") panel = h(AgentsTab, { jobs: jobs, error: jErr, onRefresh: loadJobs });
    else panel = h(TemplatesTab, { templates: templates, error: tErr });

    return h("div", { "data-testid": "agenthub-root" },
      h("h2", null, "AgentHub"),
      h("div", { style: { display: "flex", marginBottom: "8px" } },
        tabBtn("templates", "tab-templates", "Templates"),
        tabBtn("create", "tab-create", "Create"),
        tabBtn("agents", "tab-agents", "Agents")
      ),
      h(Separator, null),
      h("div", { style: { marginTop: "16px" } }, panel)
    );
  }

  window.__HERMES_PLUGINS__.register("agenthub", AgentHub);
})();
