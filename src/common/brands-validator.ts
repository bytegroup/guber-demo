import {toBasicASCII} from "../utils";

const ignoreWords= ['BIO', 'NEB'];
const frontWords = ['RICH', 'RFF', 'flex', 'ultra', 'gum', 'beauty', 'orto', 'free', '112', 'kin', 'happy'];
const firstOrSecondWords = ['heel', 'contour', 'nero', 'rsv'];
const exactMatchedWords = ['HAPPY'];

function isIgnoreWord(word: string): boolean {
    return ignoreWords.includes(word.toUpperCase());
}

/*
* validation 1: convert special chars to basic ASCII chars e.g: Babē = Babe
* */
export function convertToBasicASCII(str: string): string {
    return toBasicASCII(str);
}

/*
* validation 2: ignore words [BIO, NEB]
* ignore words during brand matching
* */
export function deductIgnoreWord(brand: string):string {
    return brand.split(/\s+/)
        .filter(w => !isIgnoreWord(w) && w.length > 0)
        .join(' ')
        .trim();
}

/*
* validation 3: must be words at front in title [RICH, RFF, flex, ultra, gum, beauty, orto, free, 112, kin, happy]
* */
export function isStartsWithFrontWord(brandWord: string, frontTitleWord: string): boolean {
    const isFrontWord = frontWords.some(w => brandWord.toLowerCase() === w.toLowerCase())

    if (!isFrontWord) {
        return true  // Not a front word, no validation needed
    }

    // Must match first word in title
    return frontTitleWord && frontTitleWord.toLowerCase() === brandWord.toLowerCase()
}

/*
* validation 4: first or second word should be [heel, contour, nero, rsv]
* */
export function isContainsFirstOrSecondWord(brandWord: string, titleWords : string[]):boolean{

    if( firstOrSecondWords.some(w => brandWord.toLowerCase()===w.toLowerCase()) ){
        const foundAtIdx = titleWords.findIndex(w => w.toLowerCase() === brandWord.toLowerCase());
        return foundAtIdx === 0 || foundAtIdx === 1;
    } else return true;
}

/*
* validation 6: words needs to be matched capitalized e.g: [HAPPY]
* if brand word is included in exact matched words and also capitalized return true otherwise false
* if brand word is not included in exact matched words return true; no need to check whether it capitalized or not
* */
export function isValidExactCapitalizedWords(word: string): boolean{
    return exactMatchedWords.some(w=>word.toLowerCase()===w.toLowerCase()) ? exactMatchedWords.includes(word) : true;
}

/*
* check brand position validity
* */
export function validateBrandPosition(title: string, brand: string): boolean {
    const titleWords = title.trim().split(/\s+/)
    return brand.trim().split(/\s+/)
        .every(w => isValidExactCapitalizedWords(w)
            && isStartsWithFrontWord(w, titleWords[0])
            && isContainsFirstOrSecondWord(w, titleWords));
}

export function filterMatchesByValidation(matchedBrands: string[], productTitle: string): string[] {
    return matchedBrands.filter(brand => {
        const normalizedBrand = convertToBasicASCII(brand)
        const normalizedTitle = convertToBasicASCII(productTitle)

        // Check position validation (edge cases 3, 4, 6)
        if (!validateBrandPosition(normalizedTitle, normalizedBrand)) {
            return false
        }

        // Check ignored keywords (edge case 2)
        return deductIgnoreWord(normalizedBrand).length !== 0;
    })
}

function findBrandPosition(title: string, brand: string): number {
    const position = title.toLowerCase().indexOf(brand.toLowerCase())
    return position >= 0 ? position : Infinity;
}

/*
* validation 5: Prioritize beginning matches
* If multiple brands matched, select the one appearing first in title
* */
export function prioritizeByPosition(matchedBrands: string[], productTitle: string): string[] {
    return matchedBrands.sort((brand1, brand2) =>
        findBrandPosition(productTitle, brand1) - findBrandPosition(productTitle, brand2));
}
