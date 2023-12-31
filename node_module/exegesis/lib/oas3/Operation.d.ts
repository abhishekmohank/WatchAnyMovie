import * as oas3 from 'openapi3-ts';
import RequestMediaType from './RequestMediaType';
import Oas3CompileContext from './Oas3CompileContext';
import Parameter from './Parameter';
import { RawValues } from './parameterParsers';
import { ParametersMap, ParametersByLocation, IValidationError, ExegesisContext, AuthenticationSuccess, ExegesisResponse, ResponseValidationResult, ParameterLocations } from '../types';
export default class Operation {
    readonly context: Oas3CompileContext;
    readonly oaOperation: oas3.OperationObject;
    readonly oaPath: oas3.PathItemObject;
    readonly exegesisController: string | undefined;
    readonly operationId: string | undefined;
    readonly securityRequirements: oas3.SecurityRequirementObject[];
    readonly parameterLocations: ParameterLocations;
    /**
     * If this operation has a `requestBody`, this is a list of content-types
     * the operation understands.  If this operation does not expect a request
     * body, then this is undefined.  Note this list may contain wildcards.
     */
    readonly validRequestContentTypes: string[] | undefined;
    readonly bodyRequired: boolean;
    private readonly _requestBodyContentTypes;
    private readonly _parameters;
    private readonly _responses;
    private readonly _securitySchemes;
    constructor(context: Oas3CompileContext, oaOperation: oas3.OperationObject, oaPath: oas3.PathItemObject, method: string, exegesisController: string | undefined, parentParameters: Parameter[]);
    /**
     * Given a 'content-type' from a request, return a `MediaType` object that
     * matches, or `undefined` if no objects match.
     *
     * @param contentType - The content type from the 'content-type' header on
     *   a request.
     * @returns - The MediaType object to handle this request, or undefined if
     *   no MediaType is set for the given contentType.
     */
    getRequestMediaType(contentType: string): RequestMediaType | undefined;
    /**
     * Parse parameters for this operation.
     * @param params - Raw headers, raw path params and server params from
     *   `PathResolver`, and the raw queryString.
     * @returns parsed parameters.
     */
    parseParameters(params: {
        headers: RawValues | undefined;
        rawPathParams: RawValues | undefined;
        serverParams: RawValues | undefined;
        queryString: string | undefined;
    }): ParametersByLocation<ParametersMap<any>>;
    validateParameters(parameterValues: ParametersByLocation<ParametersMap<any>>): IValidationError[] | null;
    /**
     * Validate a response.
     *
     * @param response - The response generated by a controller.
     * @param validateDefaultResponses - true to validate all responses, false
     *   to only validate non-default responses.
     */
    validateResponse(response: ExegesisResponse, validateDefaultResponses: boolean): ResponseValidationResult;
    private _runAuthenticator;
    /**
     * Checks a single security requirement from an OAS3 `security` field.
     *
     * @param triedSchemes - A cache where keys are names of security schemes
     *   we've already tried, and values are the results returned by the
     *   authenticator.
     * @param errors - An array of strings - we can push any errors we encounter
     *   to this list.
     * @param securityRequirement - The security requirement to check.
     * @param exegesisContext - The context for the request to check.
     * @returns - If the security requirement matches, this returns a
     *   `{type: 'authenticated', result}` object, where result is an object
     *   where keys are security schemes and the values are the results from
     *   the authenticator.  If the requirements are not met, returns a
     *   `{type: 'missing', failure}` object or a `{type: 'invalid', failure}`,
     *   object where `failure` is the the failure that caused this security
     *   requirement to not pass.
     */
    private _checkSecurityRequirement;
    authenticate(exegesisContext: ExegesisContext): Promise<{
        [scheme: string]: AuthenticationSuccess;
    } | undefined>;
}
