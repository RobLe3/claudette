// Interactive prompt system for setup wizard

import readline from 'readline';
import chalk from 'chalk';

export interface SelectOption {
  name: string;
  value: any;
  description?: string;
}

export class InteractivePrompts {
  private rl: readline.Interface | null = null;

  constructor() {
    this.ensureReadlineInterface();
  }

  private ensureReadlineInterface(): void {
    if (!this.rl) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
    }
  }

  /**
   * Ask a yes/no question
   */
  async confirm(message: string, defaultValue: boolean = true): Promise<boolean> {
    this.ensureReadlineInterface();
    if (!this.rl) throw new Error('Readline interface not available');
    
    const defaultDisplay = defaultValue ? 'Y/n' : 'y/N';
    const question = `${chalk.cyan('?')} ${message} (${defaultDisplay}): `;
    
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Readline interface not available'));
        return;
      }
      
      this.rl.question(question, (answer) => {
        const response = answer.toLowerCase().trim();
        
        if (response === '') {
          resolve(defaultValue);
        } else if (response === 'y' || response === 'yes') {
          resolve(true);
        } else if (response === 'n' || response === 'no') {
          resolve(false);
        } else {
          // Invalid input, ask again
          console.log(chalk.red('Please answer yes or no'));
          resolve(this.confirm(message, defaultValue));
        }
      });
    });
  }

  /**
   * Ask for text input
   */
  async input(message: string, defaultValue?: string, validator?: (value: string) => boolean | string): Promise<string> {
    this.ensureReadlineInterface();
    if (!this.rl) throw new Error('Readline interface not available');
    
    const defaultDisplay = defaultValue ? ` (${chalk.dim(defaultValue)})` : '';
    const question = `${chalk.cyan('?')} ${message}${defaultDisplay}: `;
    
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Readline interface not available'));
        return;
      }
      
      this.rl.question(question, (answer) => {
        const value = answer.trim() || defaultValue || '';
        
        if (validator) {
          const validation = validator(value);
          if (validation !== true) {
            const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
            console.log(chalk.red(errorMessage));
            resolve(this.input(message, defaultValue, validator));
            return;
          }
        }
        
        resolve(value);
      });
    });
  }

  /**
   * Ask for password input (hidden)
   */
  async password(message: string, validator?: (value: string) => boolean | string): Promise<string> {
    const question = `${chalk.cyan('?')} ${message}: `;
    
    return new Promise((resolve) => {
      // Set up stdin to not echo characters
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      let password = '';
      let inputBuffer = '';
      let processingTimeout: NodeJS.Timeout | null = null;
      
      // Mutex to prevent race conditions in buffer processing
      let processingMutex = false;
      
      // State machine for input processing
      enum InputState {
        READY,      // Ready to process input
        PROCESSING  // Currently processing input buffer
      }
      
      let state = InputState.READY;
      
      const onData = (chunk: string) => {
        // Add all incoming data to buffer
        inputBuffer += chunk.toString();
        
        // Prevent race condition with mutex check
        if (state === InputState.READY && !processingMutex) {
          state = InputState.PROCESSING;
          processingMutex = true;
          
          // Clear any existing timeout
          if (processingTimeout) {
            clearTimeout(processingTimeout);
          }
          
          // Process buffer after a minimal delay to handle paste operations
          processingTimeout = setTimeout(() => {
            processInputBuffer();
          }, 5);
        }
      };
      
      const processInputBuffer = () => {
        // Additional mutex check to prevent concurrent execution
        if (!inputBuffer || state !== InputState.PROCESSING || !processingMutex) {
          return;
        }
        
        try {
          // Process all characters in the buffer sequentially
          for (let i = 0; i < inputBuffer.length; i++) {
            const char = inputBuffer[i];
            
            switch (char) {
              case '\n':
              case '\r':
              case '\u0004': // Ctrl-D
                // Complete input - finish processing and return
                cleanup();
                process.stdout.write('\n');
                
                if (validator) {
                  const validation = validator(password);
                  if (validation !== true) {
                    const errorMessage = typeof validation === 'string' ? validation : 'Invalid input';
                    console.log(chalk.red(errorMessage));
                    resolve(this.password(message, validator));
                    return;
                  }
                }
                
                resolve(password);
                return;
                
              case '\u0003': // Ctrl-C
                cleanup();
                process.stdout.write('\n');
                process.exit(1);
                break;
                
              case '\u007f': // Backspace
                if (password.length > 0) {
                  password = password.slice(0, -1);
                  process.stdout.write('\b \b');
                }
                break;
                
              default:
                // Filter out control characters and ensure printable characters
                if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
                  password += char;
                  process.stdout.write('*');
                }
                break;
            }
          }
          
          // Clear the buffer and reset state for next input
          inputBuffer = '';
          state = InputState.READY;
          processingMutex = false;
          processingTimeout = null;
        } catch (error) {
          // Ensure mutex is released even if processing fails
          processingMutex = false;
          state = InputState.READY;
          processingTimeout = null;
          throw error;
        }
      };
      
      const cleanup = () => {
        if (processingTimeout) {
          clearTimeout(processingTimeout);
          processingTimeout = null;
        }
        process.stdin.setRawMode(false);
        process.stdin.removeListener('data', onData);
        state = InputState.READY;
        processingMutex = false; // Ensure mutex is always released on cleanup
      };
      
      process.stdin.on('data', onData);
    });
  }

  /**
   * Present a selection menu
   */
  async select(message: string, options: SelectOption[], defaultValue?: any): Promise<any> {
    this.ensureReadlineInterface();
    if (!this.rl) throw new Error('Readline interface not available');
    
    console.log(chalk.cyan('?') + ` ${message}`);
    
    // Display options
    options.forEach((option, index) => {
      const isDefault = defaultValue !== undefined && option.value === defaultValue;
      const indicator = isDefault ? chalk.green('❯') : ' ';
      const name = isDefault ? chalk.green(option.name) : option.name;
      const description = option.description ? chalk.dim(` - ${option.description}`) : '';
      
      console.log(`${indicator} ${chalk.yellow((index + 1).toString())}. ${name}${description}`);
    });
    
    const question = defaultValue !== undefined 
      ? `Select option (1-${options.length}) or press Enter for default: `
      : `Select option (1-${options.length}): `;
    
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Readline interface not available'));
        return;
      }
      
      this.rl.question(question, (answer) => {
        const input = answer.trim();
        
        // If empty and there's a default, use it
        if (input === '' && defaultValue !== undefined) {
          resolve(defaultValue);
          return;
        }
        
        // Parse numeric input
        const optionIndex = parseInt(input) - 1;
        
        if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= options.length) {
          console.log(chalk.red('Invalid selection. Please choose a number from the list.'));
          resolve(this.select(message, options, defaultValue));
          return;
        }
        
        resolve(options[optionIndex].value);
      });
    });
  }

  /**
   * Present a multi-select menu
   */
  async multiSelect(message: string, options: SelectOption[], defaultValues: any[] = []): Promise<any[]> {
    this.ensureReadlineInterface();
    if (!this.rl) throw new Error('Readline interface not available');
    
    console.log(chalk.cyan('?') + ` ${message}`);
    console.log(chalk.dim('Use numbers separated by commas (e.g., 1,3,5) or "all" for all options'));
    
    // Display options
    options.forEach((option, index) => {
      const isDefault = defaultValues.includes(option.value);
      const indicator = isDefault ? chalk.green('✓') : ' ';
      const name = isDefault ? chalk.green(option.name) : option.name;
      const description = option.description ? chalk.dim(` - ${option.description}`) : '';
      
      console.log(`${indicator} ${chalk.yellow((index + 1).toString())}. ${name}${description}`);
    });
    
    const question = `Select options (comma-separated): `;
    
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Readline interface not available'));
        return;
      }
      
      this.rl.question(question, (answer) => {
        const input = answer.trim().toLowerCase();
        
        if (input === '') {
          resolve(defaultValues);
          return;
        }
        
        if (input === 'all') {
          resolve(options.map(opt => opt.value));
          return;
        }
        
        // Parse comma-separated numbers
        const selections = input.split(',')
          .map(s => parseInt(s.trim()) - 1)
          .filter(i => !isNaN(i) && i >= 0 && i < options.length);
        
        if (selections.length === 0) {
          console.log(chalk.red('Invalid selection. Please use numbers separated by commas.'));
          resolve(this.multiSelect(message, options, defaultValues));
          return;
        }
        
        const selectedValues = selections.map(i => options[i].value);
        resolve(selectedValues);
      });
    });
  }

  /**
   * Wait for user to press Enter
   */
  async waitForEnter(message: string = 'Press Enter to continue...'): Promise<void> {
    this.ensureReadlineInterface();
    if (!this.rl) throw new Error('Readline interface not available');
    
    return new Promise((resolve, reject) => {
      if (!this.rl) {
        reject(new Error('Readline interface not available'));
        return;
      }
      
      this.rl.question(chalk.dim(message), () => {
        resolve();
      });
    });
  }

  /**
   * Auto-detect and suggest values
   */
  async inputWithDetection(
    message: string, 
    detectFn: () => Promise<string[]>,
    defaultValue?: string
  ): Promise<string> {
    console.log(chalk.cyan('?') + ` ${message}`);
    console.log(chalk.dim('Detecting available options...'));
    
    try {
      const detected = await detectFn();
      
      if (detected.length > 0) {
        console.log(chalk.green('✓') + ' Detected options:');
        detected.forEach((option, index) => {
          console.log(`  ${chalk.yellow((index + 1).toString())}. ${option}`);
        });
        
        const useDetected = await this.confirm('Use one of the detected options?', true);
        
        if (useDetected) {
          if (detected.length === 1) {
            console.log(chalk.green(`Using: ${detected[0]}`));
            return detected[0];
          } else {
            const options = detected.map(value => ({ name: value, value }));
            return await this.select('Choose detected option', options);
          }
        }
      } else {
        console.log(chalk.yellow('⚠️  No options auto-detected'));
      }
      
    } catch (error) {
      console.log(chalk.red(`Detection failed: ${(error as Error).message}`));
    }
    
    // Fallback to manual input
    return await this.input('Enter manually', defaultValue);
  }

  /**
   * Display a progress prompt while waiting
   */
  async waitWithProgress(message: string, operation: () => Promise<any>): Promise<any> {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let frameIndex = 0;
    
    const interval = setInterval(() => {
      process.stdout.write(`\r${chalk.cyan(frames[frameIndex])} ${message}`);
      frameIndex = (frameIndex + 1) % frames.length;
    }, 100);
    
    try {
      const result = await operation();
      clearInterval(interval);
      process.stdout.write(`\r${chalk.green('✓')} ${message}\n`);
      return result;
    } catch (error) {
      clearInterval(interval);
      process.stdout.write(`\r${chalk.red('✗')} ${message}\n`);
      throw error;
    }
  }

  /**
   * Close the readline interface
   */
  close(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }
  }

  /**
   * Check if readline interface is available
   */
  isAvailable(): boolean {
    return this.rl !== null;
  }
}