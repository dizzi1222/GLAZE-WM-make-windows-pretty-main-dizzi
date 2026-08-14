# File: .bash_profile para pre cargar configuraciones
# .bashrc cambia el prompt ($), como se ve la rama y otras configuraciones
source ~/.bashrc
# cambia el tamaño de la fuente en mintty y los colores
source ~/.minttyrc

# Oh My Bash
if [[ -f ~/.bashrc ]]; then
  source ~/.bashrc
fi

# Cargar API keys (OLLAMA, OPENROUTER, DEEPSEEK, GOOGLE, etc.)
if [ -f ~/.api-keys.sh ]; then
    . ~/.api-keys.sh
fi