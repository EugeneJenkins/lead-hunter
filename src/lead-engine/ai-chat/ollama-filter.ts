import { inject, injectable } from 'tsyringe';
import { TOKENS } from '../../core/di/tokens';
import { ConfigService } from '../../core/config/config.service';
import { Ollama } from 'ollama';

@injectable()
export class OllamaFilter {
  private readonly ollama: Ollama;

  constructor(@inject(TOKENS.ConfigService) private readonly configService: ConfigService) {
    this.ollama = new Ollama({
      host: this.configService.config.ollama.host,
    });
  }

  async isLead(text: string): Promise<boolean> {
    const response = await this.ollama.chat({
      model: this.configService.config.ollama.model,
      options: {
        temperature: 0,
      },
      messages: [
        {
          role: 'system',
          content: this.configService.config.ollama.prompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
    });

    return response.message.content === 'YES';
  }
}
