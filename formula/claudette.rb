class Claudette < Formula
  desc "Claude Code compatible CLI with preprocessing, multi-backend plugins, and cost analytics"
  homepage "https://github.com/ruvnet/claude-flow"
  url "https://github.com/ruvnet/claude-flow/archive/v1.0.0.tar.gz"
  sha256 "PLACEHOLDER_SHA256_REPLACE_ON_RELEASE"
  license "MIT"
  
  depends_on "python@3.11"
  depends_on "pipx"

  def install
    # Install using pipx for isolated environment
    system "pipx", "install", buildpath, "--force"
    
    # Create symlink to make claudette available in PATH
    bin.install_symlink Formula["pipx"].opt_bin/"claudette"
  end

  test do
    # Test that claudette command is available and shows help
    system "#{bin}/claudette", "--help"
    
    # Test version output
    version_output = shell_output("#{bin}/claudette --version 2>&1", 0)
    assert_match "1.0.0", version_output
    
    # Test stats help (verify all subcommands work)
    system "#{bin}/claudette", "stats", "--help"
    
    # Test dashboard help
    system "#{bin}/claudette", "dashboard", "--help"
  end
end

# Installation notes for users:
#
# To install with Homebrew:
#   brew tap ruvnet/claude-flow
#   brew install claudette
#
# Alternative direct install:
#   brew install --build-from-source formula/claudette.rb
#
# To use pipx directly:
#   pipx install claudette
#
# Requirements:
#   - Python 3.11 or higher
#   - OpenAI API key (optional, for preprocessing)
#   - Claude CLI (for Claude integration)
#
# Configuration:
#   Edit ~/.claudette/config.yaml or set environment variables:
#     OPENAI_API_KEY - Your OpenAI API key
#     CLAUDE_CMD - Path to Claude CLI (default: 'claude')
#
# Usage examples:
#   claudette edit file.py --explain "optimize this function"
#   claudette stats --period week --backend claude
#   claudette dashboard terminal --live