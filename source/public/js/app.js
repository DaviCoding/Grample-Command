const log = document.querySelector("#deploy-log");
const logStatus = document.querySelector("#log-status");
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
const terminalPanel = document.querySelector("#terminal-panel");
const terminalToggle = document.querySelector('[data-action="toggle-terminal"]');

function setTerminalCollapsed(collapsed) {
  if (!terminalPanel || !terminalToggle) return;

  terminalPanel.classList.toggle("terminal-collapsed", collapsed);
  terminalToggle.textContent = collapsed ? "Mostrar" : "Ocultar";
  terminalToggle.setAttribute("aria-expanded", String(!collapsed));
  localStorage.setItem("commandTerminalCollapsed", String(collapsed));
}

setTerminalCollapsed(localStorage.getItem("commandTerminalCollapsed") === "true");

terminalToggle?.addEventListener("click", () => {
  setTerminalCollapsed(!terminalPanel?.classList.contains("terminal-collapsed"));
});

function writeLog(message) {
  if (!log) return;
  log.textContent = message;
}

function setStatus(message) {
  if (!logStatus) return;
  logStatus.textContent = message;
}

function setButtonLoading(button, loading) {
  button.disabled = loading;
  button.dataset.originalText ??= button.textContent ?? "";

  button.textContent = loading
    ? "Processando..."
    : button.dataset.originalText ?? "Executar";
}

async function postJson(url, payload = undefined) {
  const headers = csrfToken ? { "X-CSRF-Token": csrfToken } : {};
  const response = await fetch(url, {
    method: "POST",
    headers: payload
      ? { ...headers, "Content-Type": "application/json" }
      : headers,
    body: payload ? JSON.stringify(payload) : undefined
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Erro desconhecido.");
  }

  return data;
}

function requestImpactPassword({ title, message }) {
  const confirmed = confirm(`${title}\n\n${message}\n\nEssa ação altera o estado real dos serviços. Confirme apenas se você sabe o impacto.`);
  if (!confirmed) return null;

  const password = prompt("Digite sua senha administrativa para confirmar:");
  if (!password) return null;

  return password;
}

async function getJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message ?? "Erro desconhecido.");
  }

  return data;
}

document.querySelectorAll('[data-action="initialize"]').forEach((button) => {
  button.addEventListener("click", async () => {
    const projectId = button.dataset.projectId;
    if (!projectId) return;

    const password = requestImpactPassword({
      title: `Criar projeto ${projectId}`,
      message: "Isso vai executar git clone e criar arquivos no diretório de projetos."
    });
    if (!password) return;

    setButtonLoading(button, true);
    setStatus("Inicializando projeto");
    writeLog(`Inicializando ${projectId}...`);

    try {
      const data = await postJson(`/projects/${projectId}/initialize`, { password });

      setStatus("Projeto criado");
      writeLog([
        `project: ${data.projectId}`,
        `path: ${data.path}`,
        `status: ${data.status}`,
        "",
        ...(data.logs ?? [])
      ].join("\n"));

      setTimeout(() => location.reload(), 1000);
    } catch (error) {
      setStatus("Erro");
      writeLog(error instanceof Error ? error.message : "Erro desconhecido.");
    } finally {
      setButtonLoading(button, false);
    }
  });
});

const envModal = document.querySelector("[data-env-modal]");
const envProjectName = document.querySelector("[data-env-project-name]");
const envEditorHost = document.querySelector("#env-editor");
const createEnvButton = document.querySelector('[data-action="create-env"]');
let selectedEnvProjectId = null;
let envEditor = null;
let envTextarea = null;

function createEnvTextarea() {
  if (!envEditorHost || envTextarea) return;

  envTextarea = document.createElement("textarea");
  envTextarea.className = "env-editor-textarea";
  envTextarea.spellcheck = false;
  envTextarea.value = [
    "NODE_ENV=production",
    "",
    "# Cole aqui as variÃ¡veis do projeto.",
    "# Este arquivo sÃ³ pode ser criado uma vez pelo Command."
  ].join("\n");
  envEditorHost.append(envTextarea);
}

function loadEnvEditor() {
  if (!envEditorHost || envEditor || envTextarea) return;

  if (!window.require) {
    createEnvTextarea();
    return;
  }

  window.require.config({
    paths: {
      vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs"
    }
  });

  window.require(["vs/editor/editor.main"], () => {
    envEditor = window.monaco.editor.create(envEditorHost, {
      value: [
        "NODE_ENV=production",
        "",
        "# Cole aqui as variÃ¡veis do projeto.",
        "# Este arquivo sÃ³ pode ser criado uma vez pelo Command."
      ].join("\n"),
      language: "ini",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize: 13,
      lineHeight: 22,
      scrollBeyondLastLine: false,
      wordWrap: "on"
    });
  });
}

function getEnvContent() {
  if (envEditor) return envEditor.getValue();
  if (envTextarea) return envTextarea.value;
  return "";
}

function openEnvModal(projectId, projectName) {
  if (!envModal) return;

  selectedEnvProjectId = projectId;
  if (envProjectName) {
    envProjectName.textContent = `${projectName}: escreva o conteÃºdo uma Ãºnica vez. O Command nÃ£o permite ler ou editar depois.`;
  }

  envModal.classList.remove("hidden");
  envModal.setAttribute("aria-hidden", "false");
  loadEnvEditor();
}

function closeEnvModal() {
  if (!envModal) return;

  selectedEnvProjectId = null;
  envModal.classList.add("hidden");
  envModal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll('[data-action="open-env-editor"]').forEach((button) => {
  button.addEventListener("click", () => {
    const projectId = button.dataset.projectId;
    const projectName = button.dataset.projectName ?? projectId;
    if (!projectId) return;

    openEnvModal(projectId, projectName);
  });
});

document.querySelectorAll('[data-action="close-env-editor"]').forEach((button) => {
  button.addEventListener("click", closeEnvModal);
});

createEnvButton?.addEventListener("click", async () => {
  if (!selectedEnvProjectId || !(createEnvButton instanceof HTMLButtonElement)) return;

  const content = getEnvContent();
  if (!content.trim()) {
    alert("Informe o conteÃºdo do .env antes de criar.");
    return;
  }

  const password = requestImpactPassword({
    title: `Criar .env de ${selectedEnvProjectId}`,
    message: "O arquivo serÃ¡ escrito uma Ãºnica vez. Depois disso, o Command nÃ£o poderÃ¡ ler nem editar esse conteÃºdo."
  });
  if (!password) return;

  setButtonLoading(createEnvButton, true);
  setStatus("Criando .env");
  writeLog(`Criando .env de ${selectedEnvProjectId}...`);

  try {
    const data = await postJson(`/projects/${selectedEnvProjectId}/env`, {
      password,
      content
    });

    setStatus(".env criado");
    writeLog([
      `project: ${data.projectId}`,
      `status: ${data.status}`,
      `path: ${data.path}`,
      "",
      "O conteÃºdo nÃ£o foi lido nem armazenado pelo painel."
    ].join("\n"));

    closeEnvModal();
    setTimeout(() => location.reload(), 1000);
  } catch (error) {
    setStatus("Erro");
    writeLog(error instanceof Error ? error.message : "Erro desconhecido.");
  } finally {
    setButtonLoading(createEnvButton, false);
  }
});

document.querySelectorAll('[data-action="check"]').forEach((button) => {
  button.addEventListener("click", async () => {
    const projectId = button.dataset.projectId;
    if (!projectId) return;

    setButtonLoading(button, true);
    setStatus("Verificando atualização");
    writeLog(`Verificando ${projectId}...`);

    try {
      const data = await postJson(`/deployments/${projectId}/check`);

      const current = document.querySelector(`[data-current="${projectId}"]`);
      const remote = document.querySelector(`[data-remote="${projectId}"]`);

      if (current) current.textContent = data.currentShort;
      if (remote) remote.textContent = data.remoteShort;
      const deploy = document.querySelector(`[data-action="deploy"][data-project-id="${projectId}"]`);
      if (deploy) deploy.disabled = !data.updateAvailable;

      setStatus(data.updateAvailable ? "Atualização encontrada" : "Projeto atualizado");

      writeLog([
        `project: ${data.projectName}`,
        `current: ${data.currentShort}`,
        `remote: ${data.remoteShort}`,
        `behind: ${data.behind}`,
        `updateAvailable: ${data.updateAvailable}`,
        "",
        ...data.logs
      ].join("\n"));
    } catch (error) {
      setStatus("Erro");
      writeLog(error instanceof Error ? error.message : "Erro desconhecido.");
    } finally {
      setButtonLoading(button, false);
    }
  });
});

document.querySelectorAll('[data-action="deploy"]').forEach((button) => {
  button.addEventListener("click", async () => {
    const projectId = button.dataset.projectId;
    if (!projectId) return;

    const password = requestImpactPassword({
      title: `Atualizar ${projectId}`,
      message: "Isso vai executar backup, git pull e Docker Compose. Pode reiniciar containers."
    });
    if (!password) return;

    setButtonLoading(button, true);
    setStatus("Executando deploy");
    writeLog(`Iniciando deploy de ${projectId}...`);

    try {
      const data = await postJson(`/deployments/${projectId}/deploy`, { password });

      setStatus(data.status);
      writeLog([
        `deployment: ${data.id}`,
        `project: ${data.projectName}`,
        `status: ${data.status}`,
        `from: ${data.fromCommit ?? "-"}`,
        `to: ${data.toCommit ?? "-"}`,
        `backup: ${data.backupFile ?? "-"}`,
        "",
        ...(data.logs ?? [])
      ].join("\n"));

      if (data.status === "success" || data.status === "skipped") {
        setTimeout(() => location.reload(), 1200);
      }
    } catch (error) {
      setStatus("Erro");
      writeLog(error instanceof Error ? error.message : "Erro desconhecido.");
    } finally {
      setButtonLoading(button, false);
    }
  });
});

function renderRuntimeContainers(projectId, containers) {
  const target = document.querySelector(`[data-runtime-containers="${projectId}"]`);
  const count = document.querySelector(`[data-runtime-count="${projectId}"]`);

  if (count) count.textContent = String(containers.length);
  if (!target) return;

  target.replaceChildren();

  if (containers.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty-runtime";
    empty.textContent = "Nenhum container encontrado.";
    target.append(empty);
    return;
  }

  for (const container of containers) {
    const item = document.createElement("div");
    const service = document.createElement("strong");
    const name = document.createElement("span");
    const state = document.createElement("span");
    const stateLabel = container.health || container.state;

    item.className = "runtime-container";
    service.textContent = container.service;
    name.textContent = container.name;
    state.className = `status ${String(container.state).toLowerCase()}`;
    state.textContent = stateLabel;

    item.append(service, name, state);
    target.append(item);
  }
}

function updateRuntimeState(projectId, runtime) {
  const state = document.querySelector(`[data-runtime-state="${projectId}"]`);

  if (state) {
    state.textContent = runtime.state;
    state.className = `status ${runtime.state}`;
  }

  renderRuntimeContainers(projectId, runtime.containers ?? []);
}

document.querySelectorAll('[data-action^="runtime-"]').forEach((button) => {
  button.addEventListener("click", async () => {
    const projectId = button.dataset.projectId;
    const action = button.dataset.action?.replace("runtime-", "");
    if (!projectId || !action) return;

    const mutatingAction = !["status", "logs"].includes(action);
    const password = mutatingAction
      ? requestImpactPassword({
          title: `Executar ${action} em ${projectId}`,
          message: "Essa ação controla diretamente containers Docker desse repositório."
        })
      : null;

    if (mutatingAction && !password) return;

    setButtonLoading(button, true);
    setStatus(`Executando ${action}`);
    writeLog(`${action} ${projectId}...`);

    try {
      const data = action === "status"
        ? await getJson(`/execution/${projectId}/status`)
        : action === "logs"
          ? await getJson(`/execution/${projectId}/logs?tail=250`)
          : await postJson(`/execution/${projectId}/${action}`, { password });

      if (action === "status") {
        updateRuntimeState(projectId, data);
        setStatus(data.state);
        writeLog([
          `project: ${data.projectName}`,
          `state: ${data.state}`,
          `containers: ${data.containers.length}`,
          "",
          ...(data.logs ?? [])
        ].join("\n"));
        return;
      }

      if (action === "logs") {
        setStatus("Logs carregados");
        writeLog((data.logs ?? []).join("\n"));
        return;
      }

      updateRuntimeState(projectId, data.runtime);
      setStatus("Ação concluída");
      writeLog([
        `project: ${data.projectName}`,
        `action: ${data.action}`,
        `status: ${data.status}`,
        "",
        ...(data.logs ?? [])
      ].join("\n"));
    } catch (error) {
      setStatus("Erro");
      writeLog(error instanceof Error ? error.message : "Erro desconhecido.");
    } finally {
      setButtonLoading(button, false);
    }
  });
});
