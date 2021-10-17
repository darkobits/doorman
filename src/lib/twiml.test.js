const rewire = require("rewire")
const twiml = rewire("./twiml")
const twimlResponse = twiml.__get__("twimlResponse")
// @ponicode
describe("twimlResponse", () => {
    test("0", () => {
        let callFunction = () => {
            twimlResponse(9876, false)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("1", () => {
        let callFunction = () => {
            twimlResponse(12345, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("2", () => {
        let callFunction = () => {
            twimlResponse(9876, true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("3", () => {
        let callFunction = () => {
            twimlResponse("c466a48309794261b64a4f02cfcc3d64", true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("4", () => {
        let callFunction = () => {
            twimlResponse("da7588892", true)
        }
    
        expect(callFunction).not.toThrow()
    })

    test("5", () => {
        let callFunction = () => {
            twimlResponse(undefined, undefined)
        }
    
        expect(callFunction).not.toThrow()
    })
})
