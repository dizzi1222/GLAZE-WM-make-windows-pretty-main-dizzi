-- CONFIGURAR IA EN LA LINEA: 30
-- 💸💳💰 DONDE ESTA CHATGPT? COMO IA ES TREMENDA.. PERO NO ES GRATIS PARA INTEGRARLO EN NVIM DIRECTAMENTE.
-- Al igual que Avante [avane/cursor es mejor]
--
-- PARA QUE FUNCIONE DEBES DE ELIMINAR CMP.lua
--
-- PARA ACTIVAR CIERTAS IAS NECESITAS MODIFICAR CIERTOS ARCHIVOS
-- Entre ellos:
--   - plugins/init.lua
--   - plugins/disabled.lua
--   - .config/lazy.lua
-- Y LOS RESPECTOS ARCHIVOS DE CONFIGURACION dE IA [copilot, claude-code.lua etc]
--   - .config/nvim/lua/plugins/copilot.lua [opcional usa copilot-chat.lua]
--   - .config/nvim/lua/plugins/supermaven.lua {etc..}
--
-- OBVIAMENTE REVISA LOS KEYMAPS: config/keymaps.lua
--
-- Y SOPORTE PARA WSL EXCLUSIVO DE WINDOWS.
-- local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
-- if not (vim.uv or vim.loop).fs_stat(lazypath) then
--   local lazyrepo = "https://github.com/folke/lazy.nvim.git"
--   local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
--   if vim.v.shell_error ~= 0 then
--     vim.api.nvim_echo({
--       { "Failed to clone lazy.nvim:\n", "ErrorMsg" },
--       { out, "WarningMsg" },
--       { "\nPress any key to exit..." },
--     }, true, {})
--     vim.fn.getchar()
--     os.exit(1)
--   end
-- end
-- vim.opt.rtp:prepend(lazypath)

-- 🔧 CONFIGURACIONES ESENCIALES PARA WINDOWS/WSL
-- Node.js configuration - always use latest stable version
vim.g.node_host_prog = vim.fn.exepath("node") or "/usr/local/bin/node"
-- Ensure we're using a recent Node version for LSPs and plugins

-- Spell-checking
vim.opt.spell = true -- activa spell checker
vim.opt.spelllang = { "en" }

-- SOPORTE PARA LINUX
-- bootstrap de lazy.nvim
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    "--branch=stable",
    lazypath,
  })
end
vim.opt.rtp:prepend(lazypath)

-- 📋 FIX CLIPBOARD EN WSL (CRÍTICO PARA WINDOWS)
vim.opt.clipboard = "unnamedplus" -- Use the system clipboard for all operations
if vim.fn.has("wsl") == 1 then
  vim.g.clipboard = {
    name = "win32yank", -- Use win32yank for clipboard operations
    copy = {
      ["+"] = "win32yank.exe -i --crlf",
      ["*"] = "win32yank.exe -i --crlf",
    },
    paste = {
      ["+"] = "win32yank.exe -o --lf",
      ["*"] = "win32yank.exe -o --lf",
    },
    cache_enabled = false,
  }
end

require("lazy").setup({
  spec = {
    -- Base LazyVim
    { "LazyVim/LazyVim", import = "lazyvim.plugins" },

    -- 🔹 Editor plugins
    -- Si quieres marcadores activa:
    -- { import = "lazyvim.plugins.extras.editor.harpoon2" },
    { import = "lazyvim.plugins.extras.editor.snacks_picker" },

    -- 🔹 MERN stack: formatter, linter y lenguajes
    { import = "lazyvim.plugins.extras.formatting.prettier" },
    { import = "lazyvim.plugins.extras.linting.eslint" },
    { import = "lazyvim.plugins.extras.lang.json" },
    { import = "lazyvim.plugins.extras.lang.typescript" },
    { import = "lazyvim.plugins.extras.lang.markdown" },
    -- El resto me jode la config de Ctrl + Space nose porque xd [desactiva si no usas TS o JS] - tambien MINI fue la causa y lo remplaze por SNACKS
    -- { import = "lazyvim.plugins.extras.formatting.biome" },
    -- { import = "lazyvim.plugins.extras.lang.angular" },
    -- { import = "lazyvim.plugins.extras.lang.astro" },
    -- Golang: lenguaje de programación de google
    -- { import = "lazyvim.plugins.extras.lang.go" },
    -- { import = "lazyvim.plugins.extras.lang.nix" },
    -- { import = "lazyvim.plugins.extras.lang.toml" },

    -- 🔹 AI (Copilot y Chat)
    { import = "lazyvim.plugins.extras.ai.copilot" },
    -- Si quieres usar Avente o claude desactiva lo de abajo.
    { import = "lazyvim.plugins.extras.ai.copilot-chat" },

    -- 🔹 Render Markdown (AGREGA ESTA LÍNEA) - PARA archivos.MD
    -- 🔹 Render Markdown - CONFIGURACIÓN CORREGIDA - {no funciona bien}
    {
      "MeanderingProgrammer/render-markdown.nvim",
      dependencies = { "nvim-treesitter/nvim-treesitter" },
      -- AGREGA ESTAS LÍNEAS PARA FORZAR LA CARGA:
      ft = { "markdown", "md" }, -- Se carga para archivos markdown
      event = "BufReadPre", -- Se carga al leer archivos
      config = function()
        require("render-markdown").setup({
          heading = {
            enabled = true,
            sign = true,
            style = "full",
            icons = { "① ", "② ", "③ ", "④ ", "⑤ ", "⑥ " },
            left_pad = 1,
          },
          bullet = {
            enabled = true,
            icons = { "●", "○", "◆", "◇" },
            right_pad = 1,
            highlight = "render-markdownBullet",
          },
        })
        -- Auto-activar al cargar archivos markdown
        vim.schedule(function()
          if vim.bo.filetype == "markdown" then
            require("render-markdown").enable()
          end
        end)
      end,
    },

    -- Tus plugins personalizados
    { import = "plugins" },
  },
  defaults = {
    lazy = false,
    version = false, -- usa siempre la última versión de cada plugin
  },
  install = { colorscheme = { "tokyonight", "habamax" } },
  checker = {
    enabled = true,
    notify = false,
  },
  performance = {
    rtp = {
      disabled_plugins = {
        "gzip",
        -- "matchit",
        -- "matchparen",
        -- "netrwPlugin",
        "tarPlugin",
        "tohtml",
        "tutor",
        "zipPlugin",
      },
    },
  },
})
