/**
 * Composants disponibles dans TOUS les fichiers MDX de cours, sans import.
 * (passés à <Content components={...} /> dans la page de chapitre)
 */
import Definition from './Definition.astro';
import Theorem from './Theorem.astro';
import Property from './Property.astro';
import Remark from './Remark.astro';
import Warning from './Warning.astro';
import Example from './Example.astro';
import Exercise from './Exercise.astro';
import Solution from './Solution.astro';
import Formulas from './Formulas.astro';
import Formula from './Formula.astro';
import Animation from './Animation.astro';
import Figure from './Figure.astro';
import Todo from './Todo.astro';

export const composantsPedago = {
    Definition,
    Theorem,
    Property,
    Remark,
    Warning,
    Example,
    Exercise,
    Solution,
    Formulas,
    Formula,
    Animation,
    Figure,
    Todo,
};
