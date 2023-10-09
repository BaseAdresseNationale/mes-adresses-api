import { Controller, Get, Param } from '@nestjs/common';

// app.route('/numeros/:numeroId')
//   .get(w(async (req, res) => {
//     if (req.isAdmin) {
//       res.send(Numero.expandModel(req.numero))
//     } else {
//       const filtered = Numero.filterSensitiveFields(req.numero)

//       res.send(Numero.expandModel(filtered))
//     }
//   }))

@Controller('numeros')
export class NumerosController {

  @Get(':numeroId')
  find(@Param('numeroId') numeroId: string): string {
    return 'Coucou ' + numeroId + ' !';
  }
}
