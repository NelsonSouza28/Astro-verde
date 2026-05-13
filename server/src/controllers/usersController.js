/**
 * @file usersController.js
 * @module usersController
 * @description Controller de usuarios para administracao de perfis.
 * @requisitos RF09
 * @ator Administrador
 * @mode real
 */

const { sendSuccess, sendError } = require('../utils/httpResponse');

function makeUsersController(usersService) {
  return {
    async list(req, res) {
      try {
        const users = await usersService.listarUsuarios();
        return sendSuccess(res, 'Usuarios carregados.', { users });
      } catch (error) {
        return sendError(res, error.message, 400);
      }
    },

    async create(req, res) {
      try {
        const user = await usersService.criarUsuario(req.body || {});
        return sendSuccess(res, 'Usuario criado.', { user }, 201);
      } catch (error) {
        return sendError(res, error.message, 400);
      }
    },

    async updateRole(req, res) {
      try {
        const user = await usersService.atualizarPerfil(req.params.id, req.body?.perfil);
        return sendSuccess(res, 'Perfil atualizado.', { user });
      } catch (error) {
        return sendError(res, error.message, 400);
      }
    },
  };
}

module.exports = makeUsersController;
