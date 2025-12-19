return {
  {
    "nvim-treesitter/nvim-treesitter",
    config = function()
      -- Silenciar errores de treesitter
      -- No recomendable, pero no me quedo de otra [En Windows].
      local status_ok, treesitter = pcall(require, "nvim-treesitter.configs")
      if not status_ok then
        return
      end

      treesitter.setup({
        auto_install = true,
        indent = { enable = true },
        highlight = {
          enable = true,
          additional_vim_regex_highlighting = false,
        },
      })
    end,
  },
}

