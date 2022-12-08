
/*
 **********************************************************************************
 * SRKAYCG
 * __________________
 *
 * 2017 - SRKAYCG All Rights Reserved.
 *
 * NOTICE: All information contained herein is, and remains the property of
 * SRKAYCG. The intellectual and technical concepts contained herein are
 * proprietary to SRKAYCG. Dissemination of this information or reproduction of
 * this material is strictly forbidden unless prior written permission is
 * obtained from SRKAYCG.
 *
 **********************************************************************************
 */
/**
 * @author      ::vatsal suvagiya
 * @module      :: Service: postFormMail    
 * @description :: Used to call service for LoginService
 * ----------------------------------------------------------------------------------
 * Modified By        | Modified Date  |    Note
 * ----------------------------------------------------------------------------------
 *                    | dd/MM/yyyy     |
 *___________________________________________________________________________________
 * <p>
 * This file is called for Service: LoginService
 * </p>
 */

const { transporter } = require('../../config/mailConnection')
const ejs = require('ejs')
const logger = require("../utils/logger-utils");
const func = require("../utils/utility-functions");
const path = require('path')
const moment = require('moment')
const htmlToPdf = require("html-pdf-node")
var fs = require('fs');
const conf = sails.config

const mailData = {
    from: conf.MAIL_FROM,
    to: conf.MAIL_TO,
    subject: conf.MAIL_SUBJECT,
    text: conf.MAIL_TEXT,
};
let pdf_options = {
    format: conf.PDF_OPTIONS_FORMAT,
    margin: conf.PDF_OPTIONS_MARGIN
}
module.exports = {
    nomineeDetails: nomineeDetails,
    createMailHistory: createMailHistory
};


function nomineeDetails(req) {
    logger.Start(func.procLogCons.LOG_NOMINEEDETAILS, func.logCons.FIELD_SERVICE);

    let reqBody = JSON.parse(req.body.body)
    return new Promise(async (resolve, reject) => {
        try {
            reqBody.page2.workArea = createWorkArea(reqBody.page2.workArea);

            reqBody.page2.coverageArea = createWorkArea(reqBody.page2.coverageArea);

            reqBody.page3.SourceOfInfo = createWorkArea(reqBody.page3.SourceOfInfo);

            uploadFile(func.logCons.FIELD_FILES, reqBody, req, resolve, reject)


        } catch (err) {
            logger.Error(func.procLogCons.LOG_NOMINEEDETAILS, err, func.logCons.FIELD_SERVICE);

            reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_NOMINEEDETAILS + func.logCons.CODE_ERROR, true, err))
        }
    });
}

function createWorkArea(area) {

    logger.Start(func.procLogCons.LOG_CREATEWORKAREA, func.logCons.FIELD_CREATEWORKAREA);
    let work_area = ""
    area[0].forEach(element => {
        if (element.selected == true) {
            work_area = work_area + element.name + ','
        }
    });
    logger.Success(func.procLogCons.LOG_CREATEWORKAREA + func.logCons.MSG_SUCCESS, func.logCons.FIELD_CREATEWORKAREA);
    return work_area.substring(0, work_area.length - 1)
}

function uploadFile(option, reqBody, req, resolve, reject) {
    logger.Start(func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD, func.logCons.FIELD_UPLOADFILE);

    if (reqBody.page1.self.firstname == null || reqBody.page1.self.firstname == undefined) {
        logger.Error(func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD, func.logCons.LOG_FIRSTNAME_INVALID, func.logCons.FIELD_UPLOADFILE);
        return reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_PROFILE_UPLOAD + func.logCons.CODE_ERROR, true, func.logCons.LOG_FIRSTNAME_INVALID));
    }
    let folder = reqBody.page1.self.firstname + "_" + func.logCons.LOG_CURRENT_DATETIME
    let profile_picture = reqBody.page1.profilepicture.picture

    req.file(option).upload({
        maxBytes: 1024 * 1024 * 60,
        dirname: `../../assets/${folder}`,
        saveAs: function (file, callback) {
            if (path.parse(file.filename).name + path.parse(file.filename).ext == profile_picture) {
                callback(null, "Profile_" + path.parse(file.filename).name + path.parse(file.filename).ext)
            } else {
                callback(null, path.parse(file.filename).name + path.parse(file.filename).ext)
            }
        }
    }, async function (err, uploadedFile) {
        if (err) {
            logger.Error(func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD, err.message, func.logCons.FIELD_UPLOADFILE);
            return reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD + func.logCons.CODE_ERROR, true, err.message));
        } else if (uploadedFile != null && uploadedFile != undefined && uploadedFile.length == 0) {
            logger.Error(func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD, func.msgCons.CODE_NOCONTENT, func.logCons.FIELD_UPLOADFILE);
            return reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_NO_FILES_UPLOAD + func.logCons.CODE_ERROR, true, func.msgCons.CODE_NOCONTENT));
        }

        reqBody.page3.dateTime = func.logCons.LOG_CURRENT_DATETIME

        logger.Success(func.procLogCons.LOG_MULTIPLE_FILES_UPLOAD + func.logCons.MSG_SUCCESS, func.logCons.FIELD_UPLOADFILE);

        return ejsRender(reqBody, folder, profile_picture, uploadedFile, resolve, reject);
    });
}

async function ejsRender(reqBody, folder, profile_picture, uploadedFile, resolve, reject) {
    logger.Start(func.procLogCons.LOG_RENDERING_HTML, func.logCons.FIELD_EJSRENDER);
    await ejs.renderFile('./views/Santokbaa-Form.html', { page1: reqBody.page1, page2: reqBody.page2, page3: reqBody.page3, folder: folder, profile_picture: profile_picture }, (err, html) => {

        if (err) {
            logger.Error(func.procLogCons.LOG_WRITING_HTML_FILE_ERROR, err, func.logCons.FIELD_EJSRENDER);
            return reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_WRITING_HTML_FILE_ERROR + func.logCons.CODE_ERROR, true, err));
        } else {
            logger.Success(func.procLogCons.LOG_RENDERING_HTML + func.logCons.MSG_SUCCESS, func.logCons.FIELD_EJSRENDER);
            return createPDF(html, reqBody, folder, uploadedFile, resolve, reject)
        }
    })
}

function createPDF(html, reqBody, folder, uploadedFile, resolve, reject) {
    logger.Start(func.procLogCons.LOG_GENERATING_PDF, func.logCons.FIELD_CREATEPDF);


    let filename = reqBody.page1.self.firstname + conf.FILE_TYPE
    let file = { content: html }
    let file_path = `assets/${folder}/${filename}`
    pdf_options.path = file_path,
        htmlToPdf.generatePdf(file, pdf_options, async (error, pdfBufferData) => {
            if (error) {
                logger.Error(func.procLogCons.LOG_GENERATING_PDF, error, func.logCons.FIELD_CREATEPDF);

                return reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_GENERATING_PDF + func.logCons.CODE_ERROR, true, error));
            } else {
                logger.Success(func.procLogCons.LOG_GENERATING_PDF + func.logCons.MSG_SUCCESS, func.logCons.FIELD_CREATEPDF);
                return sendMailwithAttch(filename, file_path, uploadedFile, resolve, reject);
            }
        })
}

async function sendMailwithAttch(filename, file_path, uploadedFile, resolve, reject) {
    logger.Start(func.procLogCons.LOG_MAIL_SENT, func.logCons.FIELD_SENDMAILWITHATTCH);

    mailData.attachments = [{
        filename: filename,
        path: file_path
    }]
    await transporter.sendMail(mailData).then((mail) => {

        logger.Success(func.procLogCons.LOG_MAIL_SENT + func.logCons.MSG_SUCCESS, func.logCons.FIELD_SENDMAILWITHATTCH);
        var status = (mail.rejected.length == 0) ? func.logCons.LOG_MAIL_SEND_STATUS_SUCCESSFULL : func.logCons.LOG_MAIL_SEND_STATUS_FAIL
        return createMailHistory(filename, status).then(() => {
            return resolve(func.responseGenerator(func.logCons.LOG_MAIL_SENDED, func.logCons.LOG_SUBMIT_FORM + func.logCons.MSG_SUCCESS, false, func.logCons.LOG_MAIL_SENDED + uploadedFile.map(fileObj => fileObj.filename)))
        })
            .catch((err) => {
                return reject(err)
            })

    }).catch((err) => {
        logger.Error(func.procLogCons.LOG_MAIL_SENT + func.logCons.MSG_ERROR, err, func.logCons.FIELD_SENDMAILWITHATTCH);
        return reject(func.responseGenerator(func.logCons.LOG_MAIL_SEND_ERROR, func.procLogCons.LOG_MAIL_SENT + func.logCons.MSG_ERROR, true, err))
    })
}

async function createMailHistory(filename, status) {
    logger.Success(func.procLogCons.LOG_MAIL_HISTORY + func.logCons.MSG_SUCCESS, func.logCons.FIELD_CREATEMAILHISTORY);

    return new Promise(async (resolve, reject) => {

        var file = moment(new Date()).format('DD-MM-YYYY') + conf.HISTORY_FILE_TYPE
        var histFolder = conf.HISTORY_FILE_PATH + "/" + moment(new Date).format('MMM-YYYY')
        if (!fs.existsSync(histFolder)) {
            fs.mkdirSync(histFolder, { recursive: true });
        }

        file = histFolder + "/" + file
        var headerArray = conf.EXCEL_HEADER_FIELDS

        fs.exists(file, function (exists) {
            if (!exists) {
                var writeStream = fs.createWriteStream(file);
                writeStream.write(headerArray);
                logger.Success(func.procLogCons.LOG_CREATE_HISTORY_FILE + func.logCons.MSG_SUCCESS, func.logCons.FIELD_CREATEMAILHISTORY);
            }
            let data = "" + mailData.from + '\t' + mailData.to + '\t' + mailData.cc + '\t' + filename + '\t' + func.logCons.LOG_CURRENT_DATETIME + '\t' + status + '\n';
            fs.appendFile(file, data, (err) => {
                if (err) {
                    logger.Error(func.procLogCons.LOG_APPEND_FILE, err, func.logCons.FIELD_CREATEMAILHISTORY);
                    reject(func.responseGenerator(func.logCons.MSG_ERROR, func.procLogCons.LOG_APPEND_FILE + func.logCons.CODE_ERROR, true, err));
                }
                logger.Success(func.procLogCons.LOG_MAIL_HISTORY + func.logCons.MSG_SUCCESS, func.logCons.FIELD_CREATEMAILHISTORY);
                resolve()
            });

        })
    })
}
