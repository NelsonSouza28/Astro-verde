/**
 * @file users.routes.js
 * @module usersRoutes
 * @description Rotas administrativas para usuarios e perfis.
 * @requisitos RF09, RN05
 * @ator Administrador
 * @mode real
 */

const express = require('express');
const { exigirPerfil } = require('../middlewares/authz');

function makeUsersRouter(controller) {
  const router = express.Router();
  router.get('/', exigirPerfil('Administrador'), (req, res) => controller.list(req, res));
  router.post('/', exigirPerfil('Administrador'), (req, res) => controller.create(req, res));
  router.patch('/:id/perfil', exigirPerfil('Administrador'), (req, res) => controller.updateRole(req, res));
  return router;
}

module.exports = makeUsersRouter;
