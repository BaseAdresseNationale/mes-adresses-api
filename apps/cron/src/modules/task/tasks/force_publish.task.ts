import { Injectable, Logger } from '@nestjs/common';
import { PublicationService } from '@/shared/modules/publication/publication.service';

import { Task } from '@/shared/types/task.type';

@Injectable()
export class ForcePublishTask implements Task {
  constructor(
    private readonly publicationService: PublicationService,
    private readonly logger: Logger,
  ) {}

  public async run(balId: string) {
    this.logger.log(`Force publish BAL ${balId}`, ForcePublishTask.name);
    await this.publicationService.exec(balId, { force: true });
  }
}
