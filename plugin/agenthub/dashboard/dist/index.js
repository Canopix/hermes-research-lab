(function () {
  "use strict";
  const SDK = window.__HERMES_PLUGIN_SDK__;
  if (!SDK) return;
  const { React, hooks, fetchJSON, components } = SDK;
  const { useState, useEffect } = hooks;
  const { Card, CardHeader, CardTitle, CardContent, Badge } = components;
  const h = React.createElement;

  function AgentHub() {
    const [templates, setTemplates] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
      fetchJSON("/api/plugins/agenthub/templates")
        .then(function (d) { setTemplates(Array.isArray(d) ? d : []); })
        .catch(function (e) { setError(String(e)); });
    }, []);

    if (error) {
      return h("div", { "data-testid": "agenthub-root" },
        h("p", { style: { color: "red" } }, "Error: " + error)
      );
    }

    if (templates.length === 0) {
      return h("div", { "data-testid": "agenthub-root" },
        h("p", null, "No templates found.")
      );
    }

    var cards = templates.map(function (tpl) {
      var badges = (tpl.tags || []).map(function (tag) {
        return h(Badge, { key: tag, variant: "secondary" }, tag);
      });
      return h(Card, { key: tpl.id, "data-testid": "tpl-card" },
        h(CardHeader, null,
          h(CardTitle, null, tpl.name)
        ),
        h(CardContent, null,
          h("p", null, tpl.description),
          h("div", { style: { marginTop: "8px", display: "flex", gap: "4px", flexWrap: "wrap" } }, badges)
        )
      );
    });

    return h("div", { "data-testid": "agenthub-root" },
      h("h2", null, "AgentHub"),
      h("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginTop: "16px" } }, cards)
    );
  }

  window.__HERMES_PLUGINS__.register("agenthub", AgentHub);
})();
