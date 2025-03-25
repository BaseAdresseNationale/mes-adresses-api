import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { AxiosError } from 'axios';
import { of, catchError, firstValueFrom } from 'rxjs';
import * as FormData from 'form-data';

import { FileUploadDTO, ValidateProfileDTO } from './type';

@Injectable()
export class ValidateurApiService {
  constructor(private readonly httpService: HttpService) {}

  public async validateFile(
    file: Buffer,
    profile: FileUploadDTO.profile = FileUploadDTO.profile._1_3_RELAX,
  ): Promise<ValidateProfileDTO> {
    const formData = new FormData();
    formData.append('file', file, {
      filename: 'bal.csv',
      contentType: 'application/octet-stream',
    });
    formData.append('profile', profile);
    const headers = formData.getHeaders();

    const { data: report } = await firstValueFrom(
      await this.httpService
        .post<ValidateProfileDTO>(`/validate/file`, formData, {
          headers,
        })
        .pipe(
          catchError((error: AxiosError) => {
            if (error.response && error.response.status === 404) {
              return of({ data: null });
            }
            throw error;
          }),
        ),
    );

    return report;
  }
}
